import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface Player {
  id: string;
  socketId: string;
  name: string;
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
  createRoom: (data: { playerName: string; estimationType: 'fibonacci' | 'hours' }, callback: (response: { success: boolean; room?: Room; player?: Player; error?: string }) => void) => void;
  joinRoom: (data: { roomCode: string; playerName: string }, callback: (response: { success: boolean; room?: Room; player?: Player; error?: string }) => void) => void;
  leaveRoom: (data: { roomCode: string; playerId: string }) => void;
  startGame: (data: { roomCode: string }) => void;
  submitVote: (data: { roomCode: string; playerId: string; vote: string }) => void;
  revealVotes: (data: { roomCode: string }) => void;
  resetRound: (data: { roomCode: string }) => void;
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

  private rooms: Map<string, Room> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.handlePlayerDisconnect(client.id);
  }

  private handlePlayerDisconnect(socketId: string) {
    this.rooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex((p) => p.socketId === socketId);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        this.server.to(roomCode).emit('playerLeft', { playerId: player.id });

        if (room.players.length === 0) {
          this.rooms.delete(roomCode);
        } else if (player.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
          this.server.to(roomCode).emit('roomState', { room });
        }
      }
    });
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private generatePlayerId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  @SubscribeMessage('createRoom')
  handleCreateRoom(client: Socket, data: { playerName: string; estimationType: 'fibonacci' | 'hours' }) {
    const roomCode = this.generateRoomCode();
    const playerId = this.generatePlayerId();
    const player: Player = {
      id: playerId,
      socketId: client.id,
      name: data.playerName,
      isHost: true,
      hasVoted: false,
    };

    const room: Room = {
      code: roomCode,
      estimationType: data.estimationType,
      players: [player],
      isRevealed: false,
      isStarted: false,
      hostId: playerId,
    };

    this.rooms.set(roomCode, room);
    client.join(roomCode);

    client.emit('roomCreated', { roomCode, player });
    client.emit('roomState', { room });

    return { success: true, room, player };
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, data: { roomCode: string; playerName: string }) {
    const room = this.rooms.get(data.roomCode.toUpperCase());

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const playerId = this.generatePlayerId();
    const player: Player = {
      id: playerId,
      socketId: client.id,
      name: data.playerName,
      isHost: false,
      hasVoted: false,
    };

    room.players.push(player);
    client.join(room.code);

    client.emit('roomJoined', { room, player });
    client.to(room.code).emit('playerJoined', { player });
    client.to(room.code).emit('roomState', { room });

    return { success: true, room, player };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, data: { roomCode: string; playerId: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) return;

    const playerIndex = room.players.findIndex((p) => p.id === data.playerId);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      client.leave(room.code);
      client.emit('roomState', { room: { ...room, players: [] } });

      this.server.to(room.code).emit('playerLeft', { playerId: player.id });

      if (room.players.length === 0) {
        this.rooms.delete(room.code);
      } else if (player.isHost && room.players.length > 0) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].id;
        this.server.to(room.code).emit('roomState', { room });
      }
    }
  }

  @SubscribeMessage('startGame')
  handleStartGame(client: Socket, data: { roomCode: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) return;

    const player = room.players.find((p) => p.socketId === client.id);
    if (!player?.isHost) return;

    room.isStarted = true;
    this.server.to(room.code).emit('gameStarted');
    client.emit('gameStarted');
  }

  @SubscribeMessage('submitVote')
  handleSubmitVote(client: Socket, data: { roomCode: string; playerId: string; vote: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) return;

    const player = room.players.find((p) => p.id === data.playerId);
    if (player) {
      player.vote = data.vote;
      player.hasVoted = true;
      this.server.to(room.code).emit('voteUpdated', { playerId: player.id, vote: data.vote });
      this.server.to(room.code).emit('roomState', { room });
    }
  }

  @SubscribeMessage('revealVotes')
  handleRevealVotes(client: Socket, data: { roomCode: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) return;

    const player = room.players.find((p) => p.socketId === client.id);
    if (!player?.isHost) return;

    room.isRevealed = true;
    this.server.to(room.code).emit('votesRevealed', { room });
  }

  @SubscribeMessage('resetRound')
  handleResetRound(client: Socket, data: { roomCode: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) return;

    const player = room.players.find((p) => p.socketId === client.id);
    if (!player?.isHost) return;

    room.isRevealed = false;
    room.players.forEach((p) => {
      p.hasVoted = false;
      p.vote = undefined;
    });

    this.server.to(room.code).emit('roomReset');
    this.server.to(room.code).emit('roomState', { room });
  }
}
