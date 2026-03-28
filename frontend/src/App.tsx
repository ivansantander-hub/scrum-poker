import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RoomManager, type EstimationType } from './components/RoomManager'
import { Lobby } from './components/Lobby'
import { GameBoard } from './components/GameBoard'
import { ConnectionStatus } from './components/ConnectionStatus'
import './App.css'

type View = 'rooms' | 'lobby' | 'game'

interface Player {
  id: string
  name: string
  isHost: boolean
  hasVoted: boolean
  vote?: string
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const pageTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30
}

function App() {
  const [view, setView] = useState<View>('rooms')
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [estimationType, setEstimationType] = useState<EstimationType>('fibonacci')

  const handleCreateRoom = (code: string, name: string, type: EstimationType) => {
    setRoomCode(code)
    setPlayerName(name)
    setEstimationType(type)
    setPlayers([
      { id: generateId(), name, isHost: true, hasVoted: false }
    ])
    setView('lobby')
  }

  const handleJoinRoom = (code: string, name: string) => {
    setRoomCode(code)
    setPlayerName(name)
    setPlayers(prev => [...prev, { id: generateId(), name, isHost: false, hasVoted: false }])
    setView('lobby')
  }

  const handleStartGame = () => {
    setView('game')
  }

  const handleLeaveRoom = () => {
    setRoomCode('')
    setPlayerName('')
    setPlayers([])
    setView('rooms')
  }

  const handleLeaveGame = () => {
    setView('lobby')
  }

  return (
    <div className="app">
      <ConnectionStatus />
      <AnimatePresence mode="wait">
        {view === 'rooms' && (
          <motion.div
            key="rooms"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
          >
            <RoomManager onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
          </motion.div>
        )}
        {view === 'lobby' && (
          <motion.div
            key="lobby"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
          >
            <Lobby
              roomCode={roomCode}
              playerName={playerName}
              players={players}
              estimationType={estimationType}
              onStartGame={handleStartGame}
              onLeaveRoom={handleLeaveRoom}
            />
          </motion.div>
        )}
        {view === 'game' && (
          <motion.div
            key="game"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
          >
            <GameBoard
              roomCode={roomCode}
              playerName={playerName}
              players={players}
              estimationType={estimationType}
              onLeaveGame={handleLeaveGame}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
