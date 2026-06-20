import { useEffect, useCallback, useState } from 'react'
import { getSocket } from './socket'
import { useGameStore, type Player } from './useGameStore'
import { soundManager } from '../utils/sound'

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
  createdAt: string
}

// Global flag to track if sessionStats listener is registered (singleton pattern)
let sessionStatsListenerRegistered = false

export function useSocket() {
  const {
    currentRoom,
    currentPlayer,
    socketId,
    isConnected,
    sessionStats,
    showSessionReport,
    setRoom,
    setPlayer,
    setSocketId,
    setConnected,
    addPlayer,
    removePlayer,
    triggerClearLocalVote,
    closeSessionReport,
    reset,
  } = useGameStore()

  const [error, setError] = useState<string | null>(null)
  const [gameShouldStart, setGameShouldStart] = useState(false)
  
  const roundHistory = useGameStore.getState().roundHistory

  // Separate effect for sessionStats - only register once globally
  useEffect(() => {
    const socket = getSocket()
    
    // Only register listener if not already registered globally
    if (!sessionStatsListenerRegistered) {
      const handleSessionStats = (data: any) => {
        console.log('Session stats received:', data)
        // Use store actions directly to avoid closure issues
        useGameStore.getState().setSessionStats(data.stats)
        useGameStore.getState().setShowSessionReport(true)
      }
      
      socket.on('sessionStats', handleSessionStats)
      sessionStatsListenerRegistered = true
      console.log('SessionStats listener registered globally')
      
      return () => {
        // Only cleanup when the app unmounts completely
        // We don't cleanup here to avoid removing listeners for other instances
      }
    }
  }, [])

  useEffect(() => {
    const socket = getSocket()

    socket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
      setError(null)
      setSocketId(socket.id || null)
      
      const state = useGameStore.getState()
      if (state.currentRoom && state.currentPlayer) {
        socket.emit('rejoinRoom', { 
          roomCode: state.currentRoom.code, 
          playerId: state.currentPlayer.id,
          playerName: state.currentPlayer.name
        }, (response) => {
          if (response.success && response.room && response.player) {
            setRoom(response.room)
            setPlayer(response.player)
          }
        })
      }
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    socket.on('connect_error', () => {
      setConnected(false)
    })

    socket.on('roomCreated', (data) => {
      setPlayer(data.player)
    })

    socket.on('roomJoined', (data) => {
      setPlayer(data.player)
      setRoom(data.room)
    })

    socket.on('roomState', (data) => {
      if (data.room.players.length > 0) {
        setRoom(data.room)
        const state = useGameStore.getState()
        const currentPlayer = state.currentPlayer
        if (currentPlayer) {
          const updatedPlayer = data.room.players.find((p: Player) => p.id === currentPlayer.id)
          if (updatedPlayer) {
            setPlayer(updatedPlayer)
          }
        }
      }
    })

    socket.on('playerJoined', (data) => {
      addPlayer(data.player)
      soundManager.playJoin()
    })

    socket.on('playerLeft', (data) => {
      removePlayer(data.playerId)
      soundManager.playLeave()
    })

    socket.on('votesRevealed', () => {
      soundManager.playReveal()
    })

    socket.on('playerKicked', (data: { playerId: string; reason: string }) => {
      const state = useGameStore.getState()
      if (state.currentPlayer?.id === data.playerId) {
        soundManager.playKick()
        reset()
        useGameStore.getState().setWasKicked(true)
      } else {
        removePlayer(data.playerId)
        soundManager.playLeave()
      }
    })

    socket.on('voteUpdated', (data) => {
      useGameStore.getState().updatePlayer(data.playerId, { hasVoted: true, vote: data.vote })
    })

    socket.on('votesRevealed', (data) => {
      setRoom(data.room)
    })

    socket.on('roomReset', () => {
      const room = useGameStore.getState().currentRoom
      if (room) {
        setRoom({
          ...room,
          isRevealed: false,
          players: room.players.map((p) => ({ ...p, hasVoted: false, vote: undefined })),
        })
        triggerClearLocalVote()
      }
    })

    socket.on('gameStarted', () => {
      const room = useGameStore.getState().currentRoom
      if (room) {
        setRoom({ ...room, isStarted: true })
      }
      setGameShouldStart(true)
    })

    socket.on('roundHistory', (data) => {
      useGameStore.getState().setRoundHistory(data.history)
    })

    socket.on('error', (data) => {
      setError(data.message)
    })

    if (socket.connected) {
      setConnected(true)
      setSocketId(socket.id || null)
    }

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('roomCreated')
      socket.off('roomJoined')
      socket.off('roomState')
      socket.off('playerJoined')
      socket.off('playerLeft')
      socket.off('playerKicked')
      socket.off('voteUpdated')
      socket.off('votesRevealed')
      socket.off('roomReset')
      socket.off('gameStarted')
      socket.off('roundHistory')
      socket.off('error')
    }
  }, [setConnected, setSocketId, setPlayer, setRoom, addPlayer, removePlayer])

  const createRoom = useCallback((playerName: string, estimationType: 'fibonacci' | 'hours', avatar: string) => {
    const socket = getSocket()
    setError(null)
    socket.emit('createRoom', { playerName, estimationType, avatar }, (response) => {
      if (response.success && response.room && response.player) {
        setRoom(response.room)
        setPlayer(response.player)
      } else {
        setError(response.error || 'Failed to create room')
      }
    })
  }, [setRoom, setPlayer])

  const joinRoom = useCallback((roomCode: string, playerName: string, avatar: string) => {
    const socket = getSocket()
    setError(null)
    socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), playerName, avatar }, (response) => {
      if (response.success && response.room && response.player) {
        setRoom(response.room)
        setPlayer(response.player)
      } else {
        setError(response.error || 'Failed to join room')
      }
    })
  }, [setRoom, setPlayer])

  const leaveRoom = useCallback(() => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer) return
    socket.emit('leaveRoom', { roomCode: currentRoom.code, playerId: currentPlayer.id })
    reset()
    setGameShouldStart(false)
  }, [reset])

  const startGame = useCallback(() => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer?.isHost) return
    socket.emit('startGame', { roomCode: currentRoom.code, playerId: currentPlayer.id })
  }, [setRoom])

  const submitVote = useCallback((vote: string) => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer) return
    socket.emit('submitVote', { roomCode: currentRoom.code, playerId: currentPlayer.id, vote })
  }, [])

  const revealVotes = useCallback(() => {
    const socket = getSocket()
    const { currentRoom, currentPlayer } = useGameStore.getState()
    if (!currentRoom || !currentPlayer?.isHost) return
    socket.emit('revealVotes', { roomCode: currentRoom.code, playerId: currentPlayer.id })
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
    if (!socket.connected) {
      console.log('Socket not connected, attempting to reconnect...')
      socket.connect()
    }
    console.log('Emitting getSessionStats for room:', roomCode)
    socket.emit('getSessionStats', { roomCode })
  }, [])

  const exportToCSV = useCallback(() => {
    const state = useGameStore.getState()
    const currentRoom = state.currentRoom
    const history = state.roundHistory
    if (!history.length || !currentRoom) return

    const headers = ['Round', 'Date', 'Player', 'Vote', 'Average']
    const rows: string[] = []
    
    history.forEach((round: RoundHistory) => {
      round.votes.forEach((vote: RoundVote) => {
        rows.push([
          round.roundNumber,
          new Date(round.createdAt).toLocaleString(),
          vote.playerName,
          vote.vote,
          round.average
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
    exportToCSV,
    clearError: () => setError(null),
    clearGameStart: () => setGameShouldStart(false),
    closeSessionReport,
  }
}
