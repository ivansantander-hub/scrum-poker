import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RoomManager } from './components/RoomManager'
import { Lobby } from './components/Lobby'
import { GameBoard } from './components/GameBoard'
import { ConnectionStatus } from './components/ConnectionStatus'
import { useSocket } from './hooks/useSocket'
import { useGameStore } from './hooks/useGameStore'
import './App.css'

type View = 'rooms' | 'lobby' | 'game'

const TITLES = {
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
  }
}

function AppContent() {
  const [view, setView] = useState<View>('rooms')
  const [prefilledRoomCode, setPrefilledRoomCode] = useState<string | null>(null)
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    if (roomCode) {
      setPrefilledRoomCode(roomCode.toUpperCase())
      setView('rooms')
    }
  }, [])

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
    document.title = TITLES[view][lang]
    document.documentElement.lang = lang
    
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      const descriptions = {
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
      metaDesc.setAttribute('content', descriptions[view][lang])
    }
  }, [view, language, currentRoom])

  const handleCreateRoom = (_code: string, name: string, type: 'fibonacci' | 'hours', avatar: string) => {
    createRoom(name, type, avatar)
    setView('lobby')
    clearPrefilledCode()
  }

  const handleJoinRoom = (code: string, name: string, avatar: string) => {
    joinRoom(code, name, avatar)
    setView('lobby')
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

  return (
    <>
      <AnimatePresence mode="wait">
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
