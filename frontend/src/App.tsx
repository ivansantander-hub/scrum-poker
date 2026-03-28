import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RoomManager } from './components/RoomManager'
import { Lobby } from './components/Lobby'
import { GameBoard } from './components/GameBoard'
import { ConnectionStatus } from './components/ConnectionStatus'
import { RoomNotFound } from './components/RoomNotFound'
import { useSocket } from './hooks/useSocket'
import { useGameStore } from './hooks/useGameStore'
import './App.css'

type View = 'rooms' | 'lobby' | 'game' | 'not-found'

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
  }
}

function AppContent() {
  const [view, setView] = useState<View>('rooms')
  const [prefilledRoomCode, setPrefilledRoomCode] = useState<string | null>(null)
  const [notFoundRoomCode, setNotFoundRoomCode] = useState<string | null>(null)
  const { currentRoom, currentPlayer, language } = useGameStore()
  const {
    error,
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
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    if (roomCode) {
      setPrefilledRoomCode(roomCode.toUpperCase())
      setView('rooms')
    }
  }, [])

  useEffect(() => {
    if (error && (error.toLowerCase().includes('not found') || error.toLowerCase().includes('no existe') || error.toLowerCase().includes('does not exist'))) {
      setNotFoundRoomCode(prefilledRoomCode)
      setView('not-found')
    }
  }, [error, prefilledRoomCode])

  useEffect(() => {
    if (currentRoom && currentPlayer && view !== 'not-found') {
      if (currentRoom.isStarted) {
        setView('game')
      } else {
        setView('lobby')
      }
    }
  }, [currentRoom, currentPlayer])

  useEffect(() => {
    if (gameShouldStart && view === 'lobby') {
      setView('game')
      clearGameStart()
    }
  }, [gameShouldStart, view, clearGameStart])

  useEffect(() => {
    if (currentRoom && currentPlayer) {
      if (currentRoom.isStarted) {
        setView('game')
      } else {
        setView('lobby')
      }
    }
  }, [])

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
    setView('lobby')
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
    setView('game')
  }

  const handleJoinGame = () => {
    setView('game')
  }

  const handleLeaveRoom = () => {
    leaveRoom()
    setView('rooms')
  }

  const handleLeaveGame = () => {
    setView('lobby')
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
    clearError()
    reset()
    setView('rooms')
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <>
      <AnimatePresence mode="wait">
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
