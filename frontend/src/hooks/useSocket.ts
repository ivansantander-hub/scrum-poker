import { useEffect, useCallback, useState } from 'react'
import { getSocket } from './socket'
import { useGameStore, type Player } from './useGameStore'

export function useSocket() {
  const {
    currentRoom,
    currentPlayer,
    socketId,
    isConnected,
    setRoom,
    setPlayer,
    setSocketId,
    setConnected,
    addPlayer,
    removePlayer,
    triggerClearLocalVote,
    reset,
  } = useGameStore()

  const [error, setError] = useState<string | null>(null)
  const [gameShouldStart, setGameShouldStart] = useState(false)

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
    })

    socket.on('playerLeft', (data) => {
      removePlayer(data.playerId)
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
      socket.off('voteUpdated')
      socket.off('votesRevealed')
      socket.off('roomReset')
      socket.off('gameStarted')
      socket.off('error')
    }
  }, [setConnected, setSocketId, setPlayer, setRoom, addPlayer, removePlayer])

  const createRoom = useCallback((playerName: string, estimationType: 'fibonacci' | 'hours') => {
    const socket = getSocket()
    setError(null)
    socket.emit('createRoom', { playerName, estimationType }, (response) => {
      if (response.success && response.room && response.player) {
        setRoom(response.room)
        setPlayer(response.player)
      } else {
        setError(response.error || 'Failed to create room')
      }
    })
  }, [setRoom, setPlayer])

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const socket = getSocket()
    setError(null)
    socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), playerName }, (response) => {
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

  return {
    socketId,
    isConnected,
    currentRoom,
    currentPlayer,
    error,
    gameShouldStart,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitVote,
    revealVotes,
    resetRound,
    clearError: () => setError(null),
    clearGameStart: () => setGameShouldStart(false),
  }
}
