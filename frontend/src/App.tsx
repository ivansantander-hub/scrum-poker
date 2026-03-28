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

function AppContent() {
  const [view, setView] = useState<View>('rooms')
  const { currentRoom, currentPlayer } = useGameStore()
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

  const handleCreateRoom = (_code: string, name: string, type: 'fibonacci' | 'hours') => {
    createRoom(name, type)
    setView('lobby')
  }

  const handleJoinRoom = (code: string, name: string) => {
    joinRoom(code, name)
    setView('lobby')
  }

  const handleStartGame = () => {
    startGame()
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
      <ConnectionStatus />
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
    </>
  )
}

export default AppContent
