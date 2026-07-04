import { io, Socket } from 'socket.io-client'
import { useGameStore } from './useGameStore'
import { soundManager } from '../utils/sound'

const SOCKET_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD 
    ? `${window.location.protocol}//${window.location.host}` 
    : 'http://localhost:3000'
)

interface ServerToClientEvents {
  roomCreated: (data: { roomCode: string; player: any }) => void
  roomJoined: (data: { room: any; player: any }) => void
  playerJoined: (data: { player: any }) => void
  playerLeft: (data: { playerId: string }) => void
  playerKicked: (data: { playerId: string; reason: string }) => void
  voteUpdated: (data: { playerId: string; hasVoted: boolean }) => void
  votesRevealed: (data: { room: any }) => void
  roomReset: () => void
  gameStarted: () => void
  error: (data: { message: string }) => void
  roomState: (data: { room: any }) => void
  serverStatus: (data: { status: string; clients: number }) => void
  roundHistory: (data: { history: any[] }) => void
  lastSavedRoundId: (data: { roundId: number }) => void
  sessionStats: (data: { stats: any; roomCode: string }) => void
}

interface ClientToServerEvents {
  createRoom: (data: { playerName: string; estimationType: 'fibonacci' | 'hours'; avatar: string }, callback?: (response: any) => void) => void
  joinRoom: (data: { roomCode: string; playerName: string; avatar: string }, callback?: (response: any) => void) => void
  rejoinRoom: (data: { roomCode: string; playerId: string; playerName: string }, callback?: (response: any) => void) => void
  leaveRoom: (data: { roomCode: string; playerId: string }) => void
  kickPlayer: (data: { roomCode: string; playerId: string; targetPlayerId: string }) => void
  startGame: (data: { roomCode: string; playerId: string }) => void
  submitVote: (data: { roomCode: string; playerId: string; vote: string }) => void
  revealVotes: (data: { roomCode: string; playerId: string; title?: string; link?: string }) => void
  updateRoundDecision: (data: { roomCode: string; playerId: string; roundId: number; finalDecision: string }) => void
  resetRound: (data: { roomCode: string; playerId: string }) => void
  getRoundHistory: (data: { roomCode: string }) => void
  getSessionStats: (data: { roomCode: string }) => void
  changeEstimationType: (data: { roomCode: string; playerId: string; estimationType: 'fibonacci' | 'hours' }) => void
  updateProfile: (data: { roomCode: string; playerId: string; playerName?: string; avatar?: string }) => void
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
let listenersInitialized = false

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    })
    if (!listenersInitialized) {
      initSocketListeners(socket)
      listenersInitialized = true
    }
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    listenersInitialized = false
  }
}

function initSocketListeners(socket: Socket<ServerToClientEvents, ClientToServerEvents>) {
  const store = useGameStore

  socket.on('connect', () => {
    store.getState().setConnected(true)
    store.getState().setError(null)
    store.getState().setSocketId(socket.id || null)
    
    const state = store.getState()
    if (state.currentRoom && state.currentPlayer) {
      socket.emit('rejoinRoom', { 
        roomCode: state.currentRoom.code, 
        playerId: state.currentPlayer.id,
        playerName: state.currentPlayer.name
      }, (response) => {
        if (response.success && response.room && response.player) {
          store.getState().setRoom(response.room)
          store.getState().setPlayer(response.player)
        } else {
          store.getState().reset()
        }
      })
    }
  })

  socket.on('disconnect', () => {
    store.getState().setConnected(false)
  })

  socket.on('connect_error', () => {
    store.getState().setConnected(false)
  })

  socket.on('roomCreated', (data) => {
    store.getState().setPlayer(data.player)
  })

  socket.on('roomJoined', (data) => {
    store.getState().setPlayer(data.player)
    store.getState().setRoom(data.room)
  })

  socket.on('roomState', (data) => {
    if (data.room.players.length > 0) {
      store.getState().setRoom(data.room)
      const currentPlayer = store.getState().currentPlayer
      if (currentPlayer) {
        const updatedPlayer = data.room.players.find((p: any) => p.id === currentPlayer.id)
        if (updatedPlayer) {
          store.getState().setPlayer(updatedPlayer)
        }
      }
    }
  })

  socket.on('playerJoined', (data) => {
    store.getState().addPlayer(data.player)
    soundManager.playJoin()
  })

  socket.on('playerLeft', (data) => {
    store.getState().removePlayer(data.playerId)
    soundManager.playLeave()
  })

  socket.on('votesRevealed', (data) => {
    store.getState().setRoom(data.room)
    soundManager.playReveal()
  })

  socket.on('playerKicked', (data: { playerId: string; reason: string }) => {
    const state = store.getState()
    if (state.currentPlayer?.id === data.playerId) {
      soundManager.playKick()
      store.getState().reset()
      store.getState().setWasKicked(true)
    } else {
      store.getState().removePlayer(data.playerId)
      soundManager.playLeave()
    }
  })

  socket.on('voteUpdated', (data) => {
    store.getState().updatePlayer(data.playerId, { hasVoted: data.hasVoted })
  })

  socket.on('roomReset', () => {
    const room = store.getState().currentRoom
    if (room) {
      store.getState().setRoom({
        ...room,
        isRevealed: false,
        players: room.players.map((p) => ({ ...p, hasVoted: false, vote: undefined })),
      })
      store.getState().triggerClearLocalVote()
    }
  })

  socket.on('gameStarted', () => {
    const room = store.getState().currentRoom
    if (room) {
      store.getState().setRoom({ ...room, isStarted: true })
    }
    store.getState().setGameShouldStart(true)
  })

  socket.on('roundHistory', (data) => {
    store.getState().setRoundHistory(data.history)
  })

  socket.on('lastSavedRoundId', (data) => {
    store.getState().setCurrentRoundId(data.roundId)
  })

  socket.on('sessionStats', (data) => {
    store.getState().setSessionStats(data.stats)
    store.getState().setShowSessionReport(true)
  })

  socket.on('error', (data) => {
    store.getState().setError(data.message)
  })
}
