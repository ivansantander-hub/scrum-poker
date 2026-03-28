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
  voteUpdated: (data: { playerId: string; vote: string }) => void;
  votesRevealed: (data: { room: Room }) => void;
  roomReset: () => void;
  gameStarted: () => void;
  error: (data: { message: string }) => void;
  roomState: (data: { room: Room }) => void;
  roundHistory: (data: { history: RoundHistory[] }) => void;
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
  revealVotes: (data: { roomCode: string; playerId: string }) => void;
  resetRound: (data: { roomCode: string; playerId: string }) => void;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketToPlayer: Map<string, { roomId: string; playerId: string }> = new Map();

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
      this.handlePlayerDisconnect(playerInfo.roomId, playerInfo.playerId);
      this.socketToPlayer.delete(client.id);
    }
  }

  private async handlePlayerDisconnect(roomId: string, playerId: string) {
    try {
      await this.playerRepository.clearSocketId(playerId);
      this.server.to(roomId).emit('playerLeft', { playerId });
    } catch (error) {
      console.error('Error handling player disconnect:', error);
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private generatePlayerId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private async buildRoomFromDb(roomRow: any): Promise<Room> {
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
        vote: p.vote || undefined,
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
      const roomCode = this.generateRoomCode();
      const playerId = this.generatePlayerId();
      const roomId = this.generatePlayerId();

      await this.roomRepository.create(roomId, roomCode, data.estimationType, playerId);
      await this.playerRepository.create(playerId, roomId, data.playerName, data.avatar, true, client.id);

      const player: Player = {
        id: playerId,
        socketId: client.id,
        name: data.playerName,
        avatar: data.avatar,
        isHost: true,
        hasVoted: false,
      };

      const room = await this.roomRepository.findById(roomId);
      if (room) {
        const fullRoom = await this.buildRoomFromDb(room);
        client.join(roomCode);
        this.socketToPlayer.set(client.id, { roomId, playerId });
        client.emit('roomCreated', { roomCode, player });
        client.emit('roomState', { room: fullRoom });
        return { success: true, room: fullRoom, player };
      }

      return { success: false, error: 'Failed to create room' };
    } catch (error) {
      console.error('Error creating room:', error);
      return { success: false, error: 'Failed to create room' };
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, data: { roomCode: string; playerName: string; avatar: string }) {
    try {
      const room = await this.roomRepository.findByCode(data.roomCode.toUpperCase());

      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      const playerId = this.generatePlayerId();
      await this.playerRepository.create(playerId, room.id, data.playerName, data.avatar, false, client.id);

      const player: Player = {
        id: playerId,
        socketId: client.id,
        name: data.playerName,
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
      console.error('Error joining room:', error);
      return { success: false, error: 'Failed to join room' };
    }
  }

  @SubscribeMessage('rejoinRoom')
  async handleRejoinRoom(client: Socket, data: { roomCode: string; playerId: string; playerName: string }) {
    try {
      const room = await this.roomRepository.findByCode(data.roomCode.toUpperCase());

      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      const existingPlayer = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);

      if (existingPlayer) {
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

        const fullRoom = await this.buildRoomFromDb(room);
        client.join(room.code);
        this.socketToPlayer.set(client.id, { roomId: room.id, playerId: data.playerId });
        client.emit('roomJoined', { room: fullRoom, player });
        client.to(room.code).emit('playerJoined', { player });
        client.to(room.code).emit('roomState', { room: fullRoom });

        return { success: true, room: fullRoom, player };
      }

      const newPlayerId = this.generatePlayerId();
      await this.playerRepository.create(newPlayerId, room.id, data.playerName, 'vincent', false, client.id);

      const player: Player = {
        id: newPlayerId,
        socketId: client.id,
        name: data.playerName,
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
      console.error('Error rejoining room:', error);
      return { success: false, error: 'Failed to rejoin room' };
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, data: { roomCode: string; playerId: string }) {
    try {
      const room = await this.roomRepository.findByCode(data.roomCode);
      if (!room) return;

      const player = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!player) return;

      await this.playerRepository.delete(data.playerId);
      this.socketToPlayer.delete(client.id);
      client.leave(room.code);

      const remainingPlayers = await this.playerRepository.findByRoomId(room.id);
      
      if (remainingPlayers.length === 0) {
        await this.roomRepository.delete(room.id);
      } else if (player.is_host) {
        const newHost = remainingPlayers[0];
        await this.playerRepository.updateHostByRoomId(room.id, newHost.id);
        const updatedRoom = await this.roomRepository.findById(room.id);
        if (updatedRoom) {
          const fullRoom = await this.buildRoomFromDb(updatedRoom);
          this.server.to(room.code).emit('roomState', { room: fullRoom });
        }
      }

      this.server.to(room.code).emit('playerLeft', { playerId: data.playerId });
      
      const updatedRoom = await this.roomRepository.findById(room.id);
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        client.emit('roomState', { room: { ...fullRoom, players: [] } });
        this.server.to(room.code).emit('roomState', { room: fullRoom });
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  @SubscribeMessage('kickPlayer')
  async handleKickPlayer(client: Socket, data: { roomCode: string; playerId: string; targetPlayerId: string }) {
    try {
      // Rate limiting check
      const rateLimit = this.voteRateLimiter.checkLimit(data.playerId, 'kick');
      if (!rateLimit.allowed) {
        this.logger.warn('Kick rate limit exceeded', { 
          playerId: data.playerId, 
          roomCode: data.roomCode,
          retryAfter: rateLimit.retryAfter 
        });
        client.emit('error', { message: `Too many kick attempts. Try again in ${rateLimit.retryAfter}s` });
        return;
      }

      const room = await this.roomRepository.findByCode(data.roomCode);
      if (!room) return;

      const requester = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!requester?.is_host) {
        this.logger.warn('Non-host attempted to kick player', { 
          playerId: data.playerId, 
          roomCode: data.roomCode 
        });
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

      const remainingPlayers = await this.playerRepository.findByRoomId(room.id);
      if (remainingPlayers.length === 0) {
        await this.roomRepository.delete(room.id);
      } else if (targetPlayer.is_host) {
        const newHost = remainingPlayers[0];
        await this.playerRepository.updateHostByRoomId(room.id, newHost.id);
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
      const room = await this.roomRepository.findByCode(data.roomCode);
      if (!room) return;

      const player = await this.playerRepository.findByRoomIdAndPlayerId(room.id, data.playerId);
      if (!player?.is_host) return;

      await this.roomRepository.updateIsStarted(room.id, true);
      const updatedRoom = await this.roomRepository.findById(room.id);
      
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        this.server.to(room.code).emit('gameStarted');
        client.emit('gameStarted');
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }

  @SubscribeMessage('submitVote')
  async handleSubmitVote(client: Socket, data: { roomCode: string; playerId: string; vote: string }) {
    try {
      // Rate limiting check
      const rateLimit = this.voteRateLimiter.checkLimit(data.playerId, 'vote');
      if (!rateLimit.allowed) {
        this.logger.warn('Vote rate limit exceeded', { 
          playerId: data.playerId, 
          roomCode: data.roomCode,
          retryAfter: rateLimit.retryAfter 
        });
        client.emit('error', { message: `Too many votes. Try again in ${rateLimit.retryAfter}s` });
        return;
      }

      const room = await this.roomRepository.findByCode(data.roomCode);
      if (!room) return;

      await this.playerRepository.updateVote(data.playerId, data.vote);
      
      this.logger.log('Vote submitted', { 
        playerId: data.playerId, 
        roomCode: data.roomCode,
        vote: data.vote 
      });
      
      const updatedRoom = await this.roomRepository.findById(room.id);
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        this.server.to(room.code).emit('roomState', { room: fullRoom });
        this.server.to(room.code).emit('voteUpdated', { playerId: data.playerId, vote: data.vote });
      }
    } catch (error) {
      this.logger.error('Error submitting vote', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode,
        playerId: data.playerId
      });
    }
  }

  @SubscribeMessage('revealVotes')
  async handleRevealVotes(client: Socket, data: { roomCode: string; playerId: string }) {
    try {
      const room = await this.roomRepository.findByCode(data.roomCode);
      if (!room) return;

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
        .map(v => v?.endsWith('h') ? parseInt(v.replace('h', '')) : parseInt(v || '0'))
        .filter(n => !isNaN(n));
      const average = numericVotes.length > 0 
        ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
        : '-';

      // Calculate standard deviation
      let stdDev = '-';
      if (numericVotes.length > 1) {
        const avg = parseFloat(average);
        const variance = numericVotes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / numericVotes.length;
        stdDev = Math.sqrt(variance).toFixed(2);
      }

      await this.roomRepository.incrementRoundCount(room.id);
      await this.databaseService.saveRound(
        room.id,
        (room.round_count || 0) + 1,
        votes,
        average,
        stdDev
      );

      this.logger.log('Votes revealed', { 
        roomCode: data.roomCode,
        hostId: data.playerId,
        voteCount: votes.length,
        average,
        stdDev 
      });

      const updatedRoom = await this.roomRepository.findById(room.id);
      
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        const history = await this.databaseService.getRoundHistory(room.id);
        this.server.to(room.code).emit('votesRevealed', { room: fullRoom });
        this.server.to(room.code).emit('roundHistory', { history });
      }
    } catch (error) {
      this.logger.error('Error revealing votes', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode,
        playerId: data.playerId
      });
    }
  }

  @SubscribeMessage('resetRound')
  async handleResetRound(client: Socket, data: { roomCode: string; playerId: string }) {
    try {
      const room = await this.roomRepository.findByCode(data.roomCode);
      if (!room) return;

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
      const room = await this.roomRepository.findByCode(data.roomCode);
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
    this.logger.log('getSessionStats received', { roomCode: data.roomCode });
    try {
      const room = await this.roomRepository.findByCode(data.roomCode);
      if (!room) {
        this.logger.warn('Room not found for stats', { roomCode: data.roomCode });
        return;
      }

      const stats = await this.databaseService.getSessionStats(room.id);
      this.logger.log('Session stats computed', { 
        roomCode: data.roomCode,
        totalRounds: stats.totalRounds 
      });
      client.emit('sessionStats', { stats, roomCode: data.roomCode });
    } catch (error) {
      this.logger.error('Error getting session stats', error instanceof Error ? error.stack : undefined, {
        roomCode: data.roomCode 
      });
    }
  }
}
