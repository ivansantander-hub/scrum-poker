import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface ServerToClientEvents {
  roomCreated: (data: { roomCode: string; player: any }) => void
  roomJoined: (data: { room: any; player: any }) => void
  playerJoined: (data: { player: any }) => void
  playerLeft: (data: { playerId: string }) => void
  voteUpdated: (data: { playerId: string; vote: string }) => void
  votesRevealed: (data: { room: any }) => void
  roomReset: () => void
  gameStarted: () => void
  error: (data: { message: string }) => void
  roomState: (data: { room: any }) => void
  serverStatus: (data: { status: string; clients: number }) => void
}

interface ClientToServerEvents {
  createRoom: (data: { playerName: string; estimationType: 'fibonacci' | 'hours' }, callback?: (response: any) => void) => void
  joinRoom: (data: { roomCode: string; playerName: string }, callback?: (response: any) => void) => void
  rejoinRoom: (data: { roomCode: string; playerId: string; playerName: string }, callback?: (response: any) => void) => void
  leaveRoom: (data: { roomCode: string; playerId: string }) => void
  startGame: (data: { roomCode: string; playerId: string }) => void
  submitVote: (data: { roomCode: string; playerId: string; vote: string }) => void
  revealVotes: (data: { roomCode: string; playerId: string }) => void
  resetRound: (data: { roomCode: string; playerId: string }) => void
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
