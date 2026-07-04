import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomRepository } from '../database/room.repository';
import { PlayerRepository } from '../database/player.repository';
import { DatabaseService } from '../database/database.service';
import { StructuredLogger } from '../common/structured-logger.service';
import { VoteRateLimiter } from '../common/vote-rate-limiter.service';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  hasVoted: boolean;
  vote?: string;
}

export interface RoundVote {
  playerId: string;
  playerName: string;
  vote: string;
}

export interface RoundHistory {
  id: number;
  roundNumber: number;
  votes: RoundVote[];
  average: string;
  stdDev: string;
  createdAt: string;
}

export interface Room {
  code: string;
  estimationType: 'fibonacci' | 'hours';
  players: Player[];
  isRevealed: boolean;
  isStarted: boolean;
  hostId: string;
  roundCount: number;
}

interface ServerToClientEvents {
  roomCreated: (data: { roomCode: string; player: Player }) => void;
  roomJoined: (data: { room: Room; player: Player }) => void;
  playerJoined: (data: { player: Player }) => void;
  playerLeft: (data: { playerId: string }) => void;
  playerKicked: (data: { playerId: string; reason: string }) => void;
  voteUpdated: (data: { playerId: string; hasVoted: boolean }) => void;
  votesRevealed: (data: { room: Room }) => void;
  roomReset: () => void;
  gameStarted: () => void;
  error: (data: { message: string }) => void;
  roomState: (data: { room: Room }) => void;
  roundHistory: (data: { history: RoundHistory[] }) => void;
  lastSavedRoundId: (data: { roundId: number }) => void;
  sessionStats: (data: { stats: any; roomCode: string }) => void;
}

interface ClientToServerEvents {
  createRoom: (data: { playerName: string; estimationType: 'fibonacci' | 'hours'; avatar: string }, callback: (response: { success: boolean; room?: Room; player?: Player; error?: string }) => void) => void;
  joinRoom: (data: { roomCode: string; playerName: string; avatar: string }, callback: (response: { success: boolean; room?: Room; player?: Player; error?: string }) => void) => void;
  rejoinRoom: (data: { roomCode: string; playerId: string; playerName: string }, callback: (response: { success: boolean; room?: Room; player?: Player; error?: string }) => void) => void;
  leaveRoom: (data: { roomCode: string; playerId: string }) => void;
  kickPlayer: (data: { roomCode: string; playerId: string; targetPlayerId: string }) => void;
  startGame: (data: { roomCode: string; playerId: string }) => void;
  submitVote: (data: { roomCode: string; playerId: string; vote: string }) => void;
  revealVotes: (data: { roomCode: string; playerId: string; title?: string; link?: string }) => void;
  updateRoundDecision: (data: { roomCode: string; playerId: string; roundId: number; finalDecision: string }) => void;
  resetRound: (data: { roomCode: string; playerId: string }) => void;
  getRoundHistory: (data: { roomCode: string }) => void;
  getSessionStats: (data: { roomCode: string }) => void;
}

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketToPlayer: Map<string, { roomId: string; playerId: string }> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  private readonly logger = new StructuredLogger();
  private readonly voteRateLimiter: VoteRateLimiter;

  constructor(
    private roomRepository: RoomRepository,
    private playerRepository: PlayerRepository,
    private databaseService: DatabaseService,
  ) {
    this.logger.setContext('AppGateway');
    this.voteRateLimiter = new VoteRateLimiter();
  }

  handleConnection(client: Socket) {
    this.logger.log('Client connected', { socketId: client.id, ip: client.handshake.address });
  }

  handleDisconnect(client: Socket) {
    this.logger.log('Client disconnected', { socketId: client.id });
    const playerInfo = this.socketToPlayer.get(client.id);
    if (playerInfo) {
      this.socketToPlayer.delete(client.id);
      const timer = setTimeout(() => {
        this.handlePlayerDisconnect(playerInfo.roomId, playerInfo.playerId);
        this.disconnectTimers.delete(playerInfo.playerId);
      }, 30000);
      this.disconnectTimers.set(playerInfo.playerId, timer);
    }
  }

  private async handlePlayerDisconnect(roomId: string, playerId: string) {
    try {
      const player = await this.playerRepository.findById(playerId);
      if (!player || player.socket_id) return;
      await this.playerRepository.clearSocketId(playerId);
      this.server.to(roomId).emit('playerLeft', { playerId });
    } catch (error) {
      this.logger.error('Error handling player disconnect', error instanceof Error ? error.stack : undefined);
    }
  }

  private normalizeCode(code: string): string {
    return (code || '').toUpperCase().trim();
  }

  private getAuthenticatedPlayer(client: Socket): { roomId: string; playerId: string } | null {
    return this.socketToPlayer.get(client.id) || null;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private generatePlayerId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private async buildRoomFromDb(roomRow: any, includeVotes = false): Promise<Room> {
    const players = await this.playerRepository.findByRoomId(roomRow.id);
    return {
      code: roomRow.code,
      estimationType: roomRow.estimation_type as 'fibonacci' | 'hours',
      players: players.map(p => ({
        id: p.id,
        socketId: p.socket_id || '',
        name: p.name,
        avatar: p.avatar || 'vincent',
        isHost: !!p.is_host,
        hasVoted: !!p.has_voted,
        vote: includeVotes ? (p.vote || undefined) : undefined,
      })),
      isRevealed: !!roomRow.is_revealed,
      isStarted: !!roomRow.is_started,
      hostId: roomRow.host_id,
      roundCount: roomRow.round_count || 0,
    };
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(client: Socket, data: { playerName: string; estimationType: 'fibonacci' | 'hours'; avatar: string }) {
    try {
      const playerName = (data.playerName || '').trim().slice(0, 30);
      if (!playerName) return { success: false, error: 'Name is required' };

      let roomCode: string;
      let roomId: string;
      let attempts = 0;
      while (attempts < 3) {
        roomCode = this.generateRoomCode();
        roomId = this.generatePlayerId();
        try {
          await this.roomRepository.create(roomId, roomCode, data.estimationType, '');
          break;
        } catch (e: any) {
          if (e?.message?.includes('UNIQUE') && attempts < 2) {
            attempts++;
            continue;
          }
          throw e;
        }
      }

      const playerId = this.generatePlayerId();
      await this.playerRepository.create(playerId, roomId!, playerName, data.avatar, true, client.id);
      await this.roomRepository.updateHostId(roomId!, playerId);

      const player: Player = {
        id: playerId,
        socketId: client.id,
        name: playerName,
        avatar: data.avatar,
        isHost: true,
        hasVoted: false,
      };

      const room = await this.roomRepository.findById(roomId!);
      if (room) {
        const fullRoom = await this.buildRoomFromDb(room);
        client.join(roomCode!);
        this.socketToPlayer.set(client.id, { roomId: roomId!, playerId });
        client.emit('roomCreated', { roomCode: roomCode!, player });
        client.emit('roomState', { room: fullRoom });
        return { success: true, room: fullRoom, player };
      }

      return { success: false, error: 'Failed to create room' };
    } catch (error) {
      this.logger.error('Error creating room', error instanceof Error ? error.stack : undefined);
      return { success: false, error: 'Failed to create room' };
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, data: { roomCode: string; playerName: string; avatar: string }) {
    try {
      const playerName = (data.playerName || '').trim().slice(0, 30);
      if (!playerName) return { success: false, error: 'Name is required' };

      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);

      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      const playerId = this.generatePlayerId();
      await this.playerRepository.create(playerId, room.id, playerName, data.avatar, false, client.id);

      const player: Player = {
        id: playerId,
        socketId: client.id,
        name: playerName,
        avatar: data.avatar,
        isHost: false,
        hasVoted: false,
      };

      const fullRoom = await this.buildRoomFromDb(room);
      client.join(room.code);
      this.socketToPlayer.set(client.id, { roomId: room.id, playerId });
      client.emit('roomJoined', { room: fullRoom, player });
      client.to(room.code).emit('playerJoined', { player });
      client.to(room.code).emit('roomState', { room: fullRoom });

      return { success: true, room: fullRoom, player };
    } catch (error) {
      this.logger.error('Error joining room', error instanceof Error ? error.stack : undefined);
      return { success: false, error: 'Failed to join room' };
    }
  }

  @SubscribeMessage('rejoinRoom')
  async handleRejoinRoom(client: Socket, data: { roomCode: string; playerId: string; playerName: string }) {
    try {
      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);

      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      const existingPlayer = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);

      if (existingPlayer) {
        if (existingPlayer.socket_id) {
          const existingSocket = this.server.sockets.sockets.get(existingPlayer.socket_id);
          if (existingSocket && existingSocket.connected) {
            return { success: false, error: 'Player session already active' };
          }
        }

        const disconnectTimer = this.disconnectTimers.get(data.playerId);
        if (disconnectTimer) {
          clearTimeout(disconnectTimer);
          this.disconnectTimers.delete(data.playerId);
        }

        await this.playerRepository.updateSocketId(data.playerId, client.id);
        
        const player: Player = {
          id: existingPlayer.id,
          socketId: client.id,
          name: existingPlayer.name,
          avatar: existingPlayer.avatar || 'vincent',
          isHost: !!existingPlayer.is_host,
          hasVoted: !!existingPlayer.has_voted,
          vote: existingPlayer.vote || undefined,
        };

        const isRevealed = !!room.is_revealed;
        const fullRoom = await this.buildRoomFromDb(room, isRevealed);
        client.join(room.code);
        this.socketToPlayer.set(client.id, { roomId: room.id, playerId: data.playerId });
        client.emit('roomJoined', { room: fullRoom, player });
        client.to(room.code).emit('roomState', { room: await this.buildRoomFromDb(room) });

        return { success: true, room: fullRoom, player };
      }

      const playerName = (data.playerName || '').trim().slice(0, 30);
      if (!playerName) return { success: false, error: 'Name is required' };

      const newPlayerId = this.generatePlayerId();
      await this.playerRepository.create(newPlayerId, room.id, playerName, 'vincent', false, client.id);

      const player: Player = {
        id: newPlayerId,
        socketId: client.id,
        name: playerName,
        avatar: 'vincent',
        isHost: false,
        hasVoted: false,
      };

      const fullRoom = await this.buildRoomFromDb(room);
      client.join(room.code);
      this.socketToPlayer.set(client.id, { roomId: room.id, playerId: newPlayerId });
      client.emit('roomJoined', { room: fullRoom, player });
      client.to(room.code).emit('playerJoined', { player });
      client.to(room.code).emit('roomState', { room: fullRoom });

      return { success: true, room: fullRoom, player };
    } catch (error) {
      this.logger.error('Error rejoining room', error instanceof Error ? error.stack : undefined);
      return { success: false, error: 'Failed to rejoin room' };
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, data: { roomCode: string; playerId: string }) {
    try {
      const auth = this.getAuthenticatedPlayer(client);
      if (!auth || auth.playerId !== data.playerId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      const player = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!player) return;

      await this.playerRepository.delete(data.playerId);
      this.socketToPlayer.delete(client.id);
      client.leave(room.code);

      const remainingPlayers = await this.playerRepository.findByRoomId(room.id);
      
      if (remainingPlayers.length === 0) {
        await this.databaseService.deleteRoundsByRoomId(room.id);
        await this.roomRepository.delete(room.id);
      } else if (player.is_host) {
        const newHost = remainingPlayers[0];
        await this.playerRepository.updateHostByRoomId(room.id, newHost.id);
        await this.roomRepository.updateHostId(room.id, newHost.id);
        const updatedRoom = await this.roomRepository.findById(room.id);
        if (updatedRoom) {
          const fullRoom = await this.buildRoomFromDb(updatedRoom);
          this.server.to(room.code).emit('roomState', { room: fullRoom });
        }
      }

      this.server.to(room.code).emit('playerLeft', { playerId: data.playerId });
    } catch (error) {
      this.logger.error('Error leaving room', error instanceof Error ? error.stack : undefined);
    }
  }

  @SubscribeMessage('kickPlayer')
  async handleKickPlayer(client: Socket, data: { roomCode: string; playerId: string; targetPlayerId: string }) {
    try {
      const auth = this.getAuthenticatedPlayer(client);
      if (!auth || auth.playerId !== data.playerId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const rateLimit = this.voteRateLimiter.checkLimit(data.playerId, 'kick');
      if (!rateLimit.allowed) {
        client.emit('error', { message: `Too many kick attempts. Try again in ${rateLimit.retryAfter}s` });
        return;
      }

      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      const requester = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!requester?.is_host) {
        client.emit('error', { message: 'Only the host can kick players' });
        return;
      }

      if (data.playerId === data.targetPlayerId) return;

      const targetPlayer = await this.playerRepository.findById(data.targetPlayerId);
      if (!targetPlayer || targetPlayer.room_id !== room.id) return;

      const targetSocketId = targetPlayer.socket_id;
      await this.playerRepository.delete(data.targetPlayerId);

      this.logger.log('Player kicked', { 
        playerId: data.targetPlayerId, 
        playerName: targetPlayer.name,
        roomCode: data.roomCode,
        kickedBy: data.playerId 
      });

      if (targetSocketId) {
        this.socketToPlayer.delete(targetSocketId);
        const targetSocket = this.server.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit('playerKicked', { 
            playerId: data.targetPlayerId, 
            reason: 'Kicked by host' 
          });
          targetSocket.leave(room.code);
        }
      }

      this.server.to(room.code).emit('playerLeft', { playerId: data.targetPlayerId });
      
      const updatedRoom = await this.roomRepository.findById(room.id);
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        this.server.to(room.code).emit('roomState', { room: fullRoom });
      }
    } catch (error) {
      this.logger.error('Error kicking player', error instanceof Error ? error.stack : undefined, { 
        playerId: data.playerId, 
        targetPlayerId: data.targetPlayerId,
        roomCode: data.roomCode 
      });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(client: Socket, data: { roomCode: string; playerId: string }) {
    try {
      const auth = this.getAuthenticatedPlayer(client);
      if (!auth || auth.playerId !== data.playerId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      const player = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!player?.is_host) return;

      if (room.is_started) return;

      await this.roomRepository.updateIsStarted(room.id, true);
      this.server.to(room.code).emit('gameStarted');
    } catch (error) {
      this.logger.error('Error starting game', error instanceof Error ? error.stack : undefined);
    }
  }

  @SubscribeMessage('submitVote')
  async handleSubmitVote(client: Socket, data: { roomCode: string; playerId: string; vote: string }) {
    try {
      const auth = this.getAuthenticatedPlayer(client);
      if (!auth || auth.playerId !== data.playerId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const rateLimit = this.voteRateLimiter.checkLimit(data.playerId, 'vote');
      if (!rateLimit.allowed) {
        client.emit('error', { message: `Too many votes. Try again in ${rateLimit.retryAfter}s` });
        return;
      }

      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      if (!room.is_started) {
        client.emit('error', { message: 'Game has not started yet' });
        return;
      }
      if (room.is_revealed) {
        client.emit('error', { message: 'Votes already revealed' });
        return;
      }

      const player = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!player) return;

      const vote = (data.vote || '').trim().slice(0, 10);
      if (!vote) return;

      await this.playerRepository.updateVote(data.playerId, vote);
      
      const updatedRoom = await this.roomRepository.findById(room.id);
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        this.server.to(room.code).emit('roomState', { room: fullRoom });
        this.server.to(room.code).emit('voteUpdated', { playerId: data.playerId, hasVoted: true });
      }
    } catch (error) {
      this.logger.error('Error submitting vote', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode,
        playerId: data.playerId
      });
    }
  }

  @SubscribeMessage('revealVotes')
  async handleRevealVotes(client: Socket, data: { roomCode: string; playerId: string; title?: string; link?: string }) {
    try {
      const auth = this.getAuthenticatedPlayer(client);
      if (!auth || auth.playerId !== data.playerId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const rateLimit = this.voteRateLimiter.checkLimit(data.playerId, 'reveal');
      if (!rateLimit.allowed) {
        client.emit('error', { message: `Too many reveal attempts. Try again in ${rateLimit.retryAfter}s` });
        return;
      }

      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      if (room.is_revealed) return;

      const player = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!player?.is_host) return;

      await this.roomRepository.updateIsRevealed(room.id, true);
      
      const players = await this.playerRepository.findByRoomId(room.id);
      const votes = players
        .filter(p => p.has_voted && p.vote)
        .map(p => ({
          playerId: p.id,
          playerName: p.name,
          vote: p.vote,
        }));
      
      const validVotes = votes.map(v => v.vote).filter(v => v && v !== '?' && v !== '☕');
      const numericVotes = validVotes
        .map(v => v?.endsWith('h') ? parseFloat(v.replace('h', '')) : parseFloat(v || '0'))
        .filter(n => !isNaN(n));
      const average = numericVotes.length > 0 
        ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
        : '-';

      let stdDev = '-';
      if (numericVotes.length > 1) {
        const avg = parseFloat(average);
        const variance = numericVotes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / numericVotes.length;
        stdDev = Math.sqrt(variance).toFixed(2);
      }

      await this.roomRepository.incrementRoundCount(room.id);

      const title = (data.title || '').trim().slice(0, 500) || undefined;
      const link = (data.link || '').trim().slice(0, 500) || undefined;

      await this.databaseService.saveRound(
        room.id,
        (room.round_count || 0) + 1,
        votes,
        average,
        stdDev,
        title,
        link
      );

      const updatedRoom = await this.roomRepository.findById(room.id);
      
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom, true);
        const history = await this.databaseService.getRoundHistory(room.id);
        this.server.to(room.code).emit('votesRevealed', { room: fullRoom });
        this.server.to(room.code).emit('roundHistory', { history });
        client.emit('lastSavedRoundId', { roundId: history[0]?.id });
      }
    } catch (error) {
      this.logger.error('Error revealing votes', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode,
        playerId: data.playerId
      });
    }
  }

  @SubscribeMessage('updateRoundDecision')
  async handleUpdateRoundDecision(client: Socket, data: { roomCode: string; playerId: string; roundId: number; finalDecision: string }) {
    try {
      const auth = this.getAuthenticatedPlayer(client);
      if (!auth || auth.playerId !== data.playerId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      const player = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!player?.is_host) return;

      const finalDecision = (data.finalDecision || '').trim().slice(0, 500);
      if (!finalDecision) return;

      await this.databaseService.updateRoundDecision(data.roundId, finalDecision, room.id);

      const updatedRoom = await this.roomRepository.findById(room.id);
      if (updatedRoom) {
        const history = await this.databaseService.getRoundHistory(room.id);
        this.server.to(room.code).emit('roundHistory', { history });
      }
    } catch (error) {
      this.logger.error('Error updating round decision', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode,
        playerId: data.playerId
      });
    }
  }

  @SubscribeMessage('resetRound')
  async handleResetRound(client: Socket, data: { roomCode: string; playerId: string }) {
    try {
      const auth = this.getAuthenticatedPlayer(client);
      if (!auth || auth.playerId !== data.playerId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      const player = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!player?.is_host) {
        client.emit('error', { message: 'Only the host can reset the round' });
        return;
      }

      await this.roomRepository.updateIsRevealed(room.id, false);
      await this.playerRepository.resetVotesByRoomId(room.id);

      const updatedRoom = await this.roomRepository.findById(room.id);
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        this.server.to(room.code).emit('roomReset');
        this.server.to(room.code).emit('roomState', { room: fullRoom });
      }
    } catch (error) {
      this.logger.error('Error resetting round', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode,
        playerId: data.playerId
      });
    }
  }

  @SubscribeMessage('getRoundHistory')
  async handleGetRoundHistory(client: Socket, data: { roomCode: string }) {
    try {
      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      const history = await this.databaseService.getRoundHistory(room.id);
      client.emit('roundHistory', { history });
    } catch (error) {
      this.logger.error('Error getting round history', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode 
      });
    }
  }

  @SubscribeMessage('getSessionStats')
  async handleGetSessionStats(client: Socket, data: { roomCode: string }) {
    try {
      const roomCode = this.normalizeCode(data.roomCode);
      const room = await this.roomRepository.findByCode(roomCode);
      if (!room) return;

      const stats = await this.databaseService.getSessionStats(room.id);
      client.emit('sessionStats', { stats, roomCode: room.code });
    } catch (error) {
      this.logger.error('Error getting session stats', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode 
      });
    }
  }
}
