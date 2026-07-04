import { useCallback } from 'react'
import { getSocket } from './socket'
import { useGameStore } from './useGameStore'

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

export function useSocket() {
  const {
    currentRoom,
    currentPlayer,
    socketId,
    isConnected,
    sessionStats,
    showSessionReport,
    error,
    gameShouldStart,
    currentRoundId,
    roundHistory,
    setRoom,
    setPlayer,
    setError,
    setGameShouldStart,
    closeSessionReport,
    reset,
  } = useGameStore()

  const createRoom = useCallback((playerName: string, estimationType: 'fibonacci' | 'hours', avatar: string) => {
    const socket = getSocket()
    useGameStore.getState().setError(null)
    socket.emit('createRoom', { playerName, estimationType, avatar }, (response) => {
      if (response.success && response.room && response.player) {
        useGameStore.getState().setRoom(response.room)
        useGameStore.getState().setPlayer(response.player)
      } else {
        useGameStore.getState().setError(response.error || 'Failed to create room')
      }
    })
  }, [])

  const joinRoom = useCallback((roomCode: string, playerName: string, avatar: string) => {
    const socket = getSocket()
    useGameStore.getState().setError(null)
    socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), playerName, avatar }, (response) => {
      if (response.success && response.room && response.player) {
        useGameStore.getState().setRoom(response.room)
        useGameStore.getState().setPlayer(response.player)
      } else {
        useGameStore.getState().setError(response.error || 'Failed to join room')
      }
    })
  }, [])

  const leaveRoom = useCallback(() => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer) return
    socket.emit('leaveRoom', { roomCode: currentRoom.code, playerId: currentPlayer.id })
    useGameStore.getState().reset()
  }, [])

  const startGame = useCallback(() => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer?.isHost) return
    socket.emit('startGame', { roomCode: currentRoom.code, playerId: currentPlayer.id })
  }, [])

  const submitVote = useCallback((vote: string) => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer) return
    socket.emit('submitVote', { roomCode: currentRoom.code, playerId: currentPlayer.id, vote })
  }, [])

  const revealVotes = useCallback((title?: string, link?: string) => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer?.isHost) return
    socket.emit('revealVotes', { roomCode: currentRoom.code, playerId: currentPlayer.id, title, link })
  }, [])

  const updateRoundDecision = useCallback((roundId: number, finalDecision: string) => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer?.isHost) return
    socket.emit('updateRoundDecision', { roomCode: currentRoom.code, playerId: currentPlayer.id, roundId, finalDecision })
  }, [])

  const resetRound = useCallback(() => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer) return
    socket.emit('resetRound', { roomCode: currentRoom.code, playerId: currentPlayer.id })
  }, [])

  const kickPlayer = useCallback((targetPlayerId: string) => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer?.isHost) return
    socket.emit('kickPlayer', { 
      roomCode: currentRoom.code, 
      playerId: currentPlayer.id,
      targetPlayerId 
    })
  }, [])

  const getRoundHistory = useCallback((roomCode: string) => {
    const socket = getSocket()
    socket.emit('getRoundHistory', { roomCode })
  }, [])

  const getSessionStats = useCallback((roomCode: string) => {
    const socket = getSocket()
    socket.emit('getSessionStats', { roomCode })
  }, [])

  const exportToCSV = useCallback(() => {
    const state = useGameStore.getState()
    const currentRoom = state.currentRoom
    const history = state.roundHistory
    if (!history.length || !currentRoom) return

    const escapeCSV = (val: string | number) => {
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headers = ['Round', 'Date', 'Title', 'Link', 'Player', 'Vote', 'Average', 'Final Decision']
    const rows: string[] = []
    
    history.forEach((round: RoundHistory) => {
      round.votes.forEach((vote: RoundVote) => {
        rows.push([
          escapeCSV(round.roundNumber),
          escapeCSV(new Date(round.createdAt).toLocaleString()),
          escapeCSV(round.title || ''),
          escapeCSV(round.link || ''),
          escapeCSV(vote.playerName),
          escapeCSV(vote.vote),
          escapeCSV(round.average),
          escapeCSV(round.finalDecision || '')
        ].join(','))
      })
    })

    const csv = [headers.join(','), ...rows].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poker-session-${currentRoom.code}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }, [])

  return {
    socketId,
    isConnected,
    currentRoom,
    currentPlayer,
    error,
    gameShouldStart,
    currentRoundId,
    roundHistory,
    sessionStats,
    showSessionReport,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitVote,
    revealVotes,
    resetRound,
    kickPlayer,
    getRoundHistory,
    getSessionStats,
    updateRoundDecision,
    exportToCSV,
    clearError: () => useGameStore.getState().setError(null),
    clearGameStart: () => useGameStore.getState().setGameShouldStart(false),
    closeSessionReport,
  }
}
