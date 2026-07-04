import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '../i18n'

export interface Player {
  id: string
  name: string
  avatar: string
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

export interface RoundVote {
  playerId: string
  playerName: string
  vote: string
}

export interface RoundHistory {
  id: number
  roundNumber: number
  votes: RoundVote[]
  average: string
  stdDev?: string
  title?: string
  link?: string
  finalDecision?: string
  createdAt: string
}

interface GameState {
  currentRoom: Room | null
  currentPlayer: Player | null
  socketId: string | null
  isConnected: boolean
  language: Language
  clearLocalVote: boolean
  savedName: string
  savedAvatar: string
  sessionStats: any
  showSessionReport: boolean
  roundHistory: RoundHistory[]
  wasKicked: boolean
  error: string | null
  gameShouldStart: boolean
  currentRoundId: number | null
  
  setRoom: (room: Room | null) => void
  setPlayer: (player: Player | null) => void
  setSocketId: (id: string | null) => void
  setConnected: (connected: boolean) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  updateRoom: (room: Room) => void
  toggleLanguage: () => void
  triggerClearLocalVote: () => void
  resetClearLocalVote: () => void
  saveUserPreferences: (name: string, avatar: string) => void
  setSessionStats: (stats: any) => void
  setShowSessionReport: (show: boolean) => void
  closeSessionReport: () => void
  setRoundHistory: (history: RoundHistory[]) => void
  setWasKicked: (kicked: boolean) => void
  setError: (error: string | null) => void
  setGameShouldStart: (start: boolean) => void
  setCurrentRoundId: (id: number | null) => void
  reset: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      currentRoom: null,
      currentPlayer: null,
      socketId: null,
      isConnected: false,
      language: 'en',
      clearLocalVote: false,
      savedName: '',
      savedAvatar: '',
      sessionStats: null,
      showSessionReport: false,
      roundHistory: [],
      wasKicked: false,
      error: null,
      gameShouldStart: false,
      currentRoundId: null,

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
      
      toggleLanguage: () => set((state) => ({ 
        language: state.language === 'en' ? 'es' : 'en' 
      })),
      
      triggerClearLocalVote: () => set({ clearLocalVote: true }),
      
      resetClearLocalVote: () => set({ clearLocalVote: false }),
      
      saveUserPreferences: (name, avatar) => set({ savedName: name, savedAvatar: avatar }),
      
      setSessionStats: (stats) => set({ sessionStats: stats }),
      
      setShowSessionReport: (show) => set({ showSessionReport: show }),
      
      closeSessionReport: () => set({ showSessionReport: false }),
      
      setRoundHistory: (history) => set({ roundHistory: history }),
      
      setWasKicked: (kicked) => set({ wasKicked: kicked }),
      
      setError: (error) => set({ error }),
      
      setGameShouldStart: (start) => set({ gameShouldStart: start }),
      
      setCurrentRoundId: (id) => set({ currentRoundId: id }),
      
      reset: () => set({ currentRoom: null, currentPlayer: null, socketId: null, isConnected: false, clearLocalVote: false, roundHistory: [], sessionStats: null, showSessionReport: false, wasKicked: false, error: null, gameShouldStart: false, currentRoundId: null }),
    }),
    {
      name: 'scrum-poker-storage',
      version: 2,
      partialize: (state) => ({
        language: state.language,
        savedName: state.savedName,
        savedAvatar: state.savedAvatar,
        currentRoom: state.currentRoom,
        currentPlayer: state.currentPlayer,
      }),
    }
  )
)
