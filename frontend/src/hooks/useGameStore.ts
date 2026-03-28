import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Player {
  id: string
  name: string
  isHost: boolean
  hasVoted: boolean
  vote?: string
  socketId?: string
}

export interface Room {
  code: string
  estimationType: 'fibonacci' | 'hours'
  players: Player[]
  isRevealed: boolean
  isStarted: boolean
  hostId: string
}

interface GameState {
  currentRoom: Room | null
  currentPlayer: Player | null
  socketId: string | null
  isConnected: boolean
  
  setRoom: (room: Room | null) => void
  setPlayer: (player: Player | null) => void
  setSocketId: (id: string | null) => void
  setConnected: (connected: boolean) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  updateRoom: (room: Room) => void
  reset: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      currentRoom: null,
      currentPlayer: null,
      socketId: null,
      isConnected: false,

      setRoom: (room) => set({ currentRoom: room }),
      
      setPlayer: (player) => set({ currentPlayer: player }),
      
      setSocketId: (id) => set({ socketId: id }),
      
      setConnected: (connected) => set({ isConnected: connected }),
      
      updatePlayer: (playerId, updates) =>
        set((state) => {
          if (!state.currentRoom) return state
          return {
            currentRoom: {
              ...state.currentRoom,
              players: state.currentRoom.players.map((p) =>
                p.id === playerId ? { ...p, ...updates } : p
              ),
            },
          }
        }),
      
      addPlayer: (player) =>
        set((state) => {
          if (!state.currentRoom) return state
          const exists = state.currentRoom.players.some((p) => p.id === player.id)
          if (exists) return state
          return {
            currentRoom: {
              ...state.currentRoom,
              players: [...state.currentRoom.players, player],
            },
          }
        }),
      
      removePlayer: (playerId) =>
        set((state) => {
          if (!state.currentRoom) return state
          return {
            currentRoom: {
              ...state.currentRoom,
              players: state.currentRoom.players.filter((p) => p.id !== playerId),
            },
          }
        }),
      
      updateRoom: (room) => set({ currentRoom: room }),
      
      reset: () => set({ currentRoom: null, currentPlayer: null, socketId: null, isConnected: false }),
    }),
    {
      name: 'scrum-poker-storage',
      partialize: (state) => ({
        currentRoom: state.currentRoom,
        currentPlayer: state.currentPlayer,
        socketId: state.socketId,
      }),
    }
  )
)
