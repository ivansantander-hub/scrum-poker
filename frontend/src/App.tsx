import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RoomManager } from './components/RoomManager'
import { Lobby } from './components/Lobby'
import { GameBoard } from './components/GameBoard'
import { ConnectionStatus } from './components/ConnectionStatus'
import { RoomNotFound } from './components/RoomNotFound'
import { KickedOut } from './components/KickedOut'
import { useSocket } from './hooks/useSocket'
import { useGameStore } from './hooks/useGameStore'
import { getSocket } from './hooks/socket'
import './App.css'

type View = 'rooms' | 'lobby' | 'game' | 'not-found' | 'kicked'

const TITLES: Record<string, { en: string; es: string }> = {
  rooms: {
    en: 'Scrum Poker - Free Planning Poker for Agile Teams',
    es: 'Scrum Poker - Poker de Planificación Gratuito para Equipos Ágiles'
  },
  lobby: {
    en: 'Waiting Room - Scrum Poker',
    es: 'Sala de Espera - Scrum Poker'
  },
  game: {
    en: 'Voting in Progress - Scrum Poker',
    es: 'Votación en Progreso - Scrum Poker'
  },
  'not-found': {
    en: 'Room Not Found - Scrum Poker',
    es: 'Sala No Encontrada - Scrum Poker'
  },
  kicked: {
    en: 'Removed from Room - Scrum Poker',
    es: 'Expulsado de la Sala - Scrum Poker'
  }
}

function AppContent() {
  const [prefilledRoomCode, setPrefilledRoomCode] = useState<string | null>(null)
  const [notFoundRoomCode, setNotFoundRoomCode] = useState<string | null>(null)
  const { currentRoom, currentPlayer, language, wasKicked, error } = useGameStore()
  const { setError: clearStoreError } = useGameStore.getState()
  const {
    gameShouldStart,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitVote,
    revealVotes,
    resetRound,
    clearError,
    clearGameStart,
  } = useSocket()
  
  const { reset } = useGameStore()

  useEffect(() => {
    getSocket()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    if (roomCode) {
      setPrefilledRoomCode(roomCode.toUpperCase())
    }
  }, [])

  const isNotFoundError = error && (error.toLowerCase().includes('not found') || error.toLowerCase().includes('no existe') || error.toLowerCase().includes('does not exist'))

  const view: View = useMemo(() => {
    if (wasKicked) return 'kicked'
    if (isNotFoundError) return 'not-found'
    if (!currentRoom || !currentPlayer) return 'rooms'
    if (currentRoom.isStarted || gameShouldStart) return 'game'
    return 'lobby'
  }, [wasKicked, isNotFoundError, currentRoom, currentPlayer, gameShouldStart])

  useEffect(() => {
    if (isNotFoundError) {
      setNotFoundRoomCode(prefilledRoomCode)
    }
  }, [isNotFoundError, prefilledRoomCode])

  useEffect(() => {
    const lang = language as 'en' | 'es'
    document.title = (TITLES as any)[view]?.[lang] || TITLES.rooms[lang]
    document.documentElement.lang = lang
    
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      const descriptions: Record<string, { en: string; es: string }> = {
        rooms: {
          en: 'Free real-time planning poker app for agile teams. Vote on story points with Fibonacci or hours estimation. No sign-up required.',
          es: 'App gratuita de poker de planificación en tiempo real para equipos ágiles. Vota story points con Fibonacci o horas. Sin registro.'
        },
        lobby: {
          en: `Room ${currentRoom?.code || ''} - Waiting for players to join`,
          es: `Sala ${currentRoom?.code || ''} - Esperando jugadores`
        },
        game: {
          en: `Room ${currentRoom?.code || ''} - Vote for story points`,
          es: `Sala ${currentRoom?.code || ''} - Vota los story points`
        }
      }
      metaDesc.setAttribute('content', (descriptions[view]?.[lang]) || descriptions.rooms[lang])
    }
  }, [view, language, currentRoom])

  const handleCreateRoom = (_code: string, name: string, type: 'fibonacci' | 'hours', avatar: string) => {
    createRoom(name, type, avatar)
    clearPrefilledCode()
  }

  const handleJoinRoom = (code: string, name: string, avatar: string) => {
    joinRoom(code, name, avatar)
    clearPrefilledCode()
  }

  const clearPrefilledCode = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.toString())
    setPrefilledRoomCode(null)
  }

  const handleStartGame = () => {
    startGame()
  }

  const handleJoinGame = () => {
    clearGameStart()
  }

  const handleLeaveRoom = () => {
    leaveRoom()
  }

  const handleLeaveGame = () => {
    // Returns to lobby view (room.isStarted stays true on server)
  }

  const handleSubmitVote = (vote: string) => {
    submitVote(vote)
  }

  const handleReveal = () => {
    revealVotes()
  }

  const handleReset = () => {
    resetRound()
  }

  const handleGoHome = () => {
    setNotFoundRoomCode(null)
    setPrefilledRoomCode(null)
    clearStoreError(null)
    useGameStore.getState().setWasKicked(false)
    clearError()
    reset()
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {view === 'kicked' && (
          <motion.div
            key="kicked"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <KickedOut onGoHome={handleGoHome} />
          </motion.div>
        )}
        {view === 'not-found' && (
          <motion.div
            key="not-found"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <RoomNotFound
              roomCode={notFoundRoomCode || undefined}
              onGoHome={handleGoHome}
            />
          </motion.div>
        )}
        {view === 'rooms' && (
          <motion.div
            key="rooms"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <RoomManager
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              error={error}
              onClearError={clearError}
              prefilledRoomCode={prefilledRoomCode}
            />
          </motion.div>
        )}
        {view === 'lobby' && currentRoom && currentPlayer && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Lobby
              room={currentRoom}
              player={currentPlayer}
              onStartGame={handleStartGame}
              onJoinGame={handleJoinGame}
              onLeaveRoom={handleLeaveRoom}
            />
          </motion.div>
        )}
        {view === 'game' && currentRoom && currentPlayer && (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <GameBoard
              room={currentRoom}
              player={currentPlayer}
              onLeaveGame={handleLeaveGame}
              onSubmitVote={handleSubmitVote}
              onReveal={handleReveal}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <ConnectionStatus />
    </>
  )
}

export default AppContent
