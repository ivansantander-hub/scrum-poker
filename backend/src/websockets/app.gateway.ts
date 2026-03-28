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

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  hasVoted: boolean;
  vote?: string;
}

export interface Room {
  code: string;
  estimationType: 'fibonacci' | 'hours';
  players: Player[];
  isRevealed: boolean;
  isStarted: boolean;
  hostId: string;
}

interface ServerToClientEvents {
  roomCreated: (data: { roomCode: string; player: Player }) => void;
  roomJoined: (data: { room: Room; player: Player }) => void;
  playerJoined: (data: { player: Player }) => void;
  playerLeft: (data: { playerId: string }) => void;
  voteUpdated: (data: { playerId: string; vote: string }) => void;
  votesRevealed: (data: { room: Room }) => void;
  roomReset: () => void;
  gameStarted: () => void;
  error: (data: { message: string }) => void;
  roomState: (data: { room: Room }) => void;
}

interface ClientToServerEvents {
  createRoom: (data: { playerName: string; estimationType: 'fibonacci' | 'hours'; avatar: string }, callback: (response: { success: boolean; room?: Room; player?: Player; error?: string }) => void) => void;
  joinRoom: (data: { roomCode: string; playerName: string; avatar: string }, callback: (response: { success: boolean; room?: Room; player?: Player; error?: string }) => void) => void;
  rejoinRoom: (data: { roomCode: string; playerId: string; playerName: string }, callback: (response: { success: boolean; room?: Room; player?: Player; error?: string }) => void) => void;
  leaveRoom: (data: { roomCode: string; playerId: string }) => void;
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

  constructor(
    private roomRepository: RoomRepository,
    private playerRepository: PlayerRepository,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
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
      const room = await this.roomRepository.findByCode(data.roomCode);
      if (!room) return;

      await this.playerRepository.updateVote(data.playerId, data.vote);
      
      const updatedRoom = await this.roomRepository.findById(room.id);
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        this.server.to(room.code).emit('voteUpdated', { playerId: data.playerId, vote: data.vote });
        this.server.to(room.code).emit('roomState', { room: fullRoom });
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
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
      const updatedRoom = await this.roomRepository.findById(room.id);
      
      if (updatedRoom) {
        const fullRoom = await this.buildRoomFromDb(updatedRoom);
        this.server.to(room.code).emit('votesRevealed', { room: fullRoom });
      }
    } catch (error) {
      console.error('Error revealing votes:', error);
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
      console.error('Error resetting round:', error);
    }
  }
}
