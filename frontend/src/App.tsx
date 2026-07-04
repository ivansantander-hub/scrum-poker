import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RoomManager } from './components/RoomManager'
import { Lobby } from './components/Lobby'
import { GameBoard } from './components/GameBoard'
import { ConnectionStatus } from './components/ConnectionStatus'
import { RoomNotFound } from './components/RoomNotFound'
import { KickedOut } from './components/KickedOut'
import { AuthScreen } from './components/AuthScreen'
import { Dashboard } from './components/Dashboard'
import { AdminPanel } from './components/AdminPanel'
import { useSocket } from './hooks/useSocket'
import { useGameStore } from './hooks/useGameStore'
import { useAuthStore } from './hooks/useAuthStore'
import { getSocket, disconnectSocket } from './hooks/socket'
import { authApi } from './lib/api'
import './App.css'

type View = 'loading' | 'auth' | 'dashboard' | 'rooms' | 'admin' | 'lobby' | 'game' | 'not-found' | 'kicked'

const TITLES: Record<string, { en: string; es: string }> = {
  loading: {
    en: 'Scrum Poker',
    es: 'Scrum Poker',
  },
  auth: {
    en: 'Sign In - Scrum Poker',
    es: 'Iniciar Sesión - Scrum Poker',
  },
  dashboard: {
    en: 'Dashboard - Scrum Poker',
    es: 'Panel - Scrum Poker',
  },
  admin: {
    en: 'Admin Panel - Scrum Poker',
    es: 'Panel Admin - Scrum Poker',
  },
  rooms: {
    en: 'Scrum Poker - Free Planning Poker for Agile Teams',
    es: 'Scrum Poker - Poker de Planificación Gratuito para Equipos Ágiles',
  },
  lobby: {
    en: 'Waiting Room - Scrum Poker',
    es: 'Sala de Espera - Scrum Poker',
  },
  game: {
    en: 'Voting in Progress - Scrum Poker',
    es: 'Votación en Progreso - Scrum Poker',
  },
  'not-found': {
    en: 'Room Not Found - Scrum Poker',
    es: 'Sala No Encontrada - Scrum Poker',
  },
  kicked: {
    en: 'Removed from Room - Scrum Poker',
    es: 'Expulsado de la Sala - Scrum Poker',
  },
}

function AppContent() {
  const [prefilledRoomCode, setPrefilledRoomCode] = useState<string | null>(null)
  const [notFoundRoomCode, setNotFoundRoomCode] = useState<string | null>(null)
  const [showRoomManager, setShowRoomManager] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const { currentRoom, currentPlayer, language, wasKicked, error } = useGameStore()
  const { setError: clearStoreError } = useGameStore.getState()
  const { user, isAuthChecked, setAuth, setToken, clearAuth, setAuthChecked } = useAuthStore()
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
    let cancelled = false

    async function checkAuth() {
      try {
        const refreshResult = (await authApi.refresh()) as { accessToken?: string } | null
        if (cancelled) return

        if (refreshResult?.accessToken) {
          setToken(refreshResult.accessToken)
          const me = (await authApi.me()) as {
            id: string
            email: string
            name: string
            role: string
          } | null
          if (me && refreshResult.accessToken) {
            setAuth(me, refreshResult.accessToken)
          }
        }
      } catch {
        // no session — stay logged out
      } finally {
        if (!cancelled) {
          setAuthChecked(true)
        }
      }
    }

    checkAuth()
    return () => { cancelled = true }
  }, [setAuth, setToken, setAuthChecked])

  useEffect(() => {
    if (isAuthChecked && user) {
      getSocket()
    }
  }, [isAuthChecked, user])

  useEffect(() => {
    if (isAuthChecked && user && prefilledRoomCode) {
      setShowRoomManager(true)
    }
  }, [isAuthChecked, user, prefilledRoomCode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    if (roomCode) {
      setPrefilledRoomCode(roomCode.toUpperCase())
    }
  }, [])

  const isNotFoundError = error && (error.toLowerCase().includes('not found') || error.toLowerCase().includes('no existe') || error.toLowerCase().includes('does not exist'))

  const view: View = useMemo(() => {
    if (!isAuthChecked) return 'loading'
    if (wasKicked) return 'kicked'
    if (isNotFoundError) return 'not-found'
    if (!user) return 'auth'
    if (currentRoom && currentPlayer) {
      if (currentRoom.isStarted || gameShouldStart) return 'game'
      return 'lobby'
    }
    if (showAdmin) return 'admin'
    if (showRoomManager) return 'rooms'
    return 'dashboard'
  }, [isAuthChecked, wasKicked, isNotFoundError, user, currentRoom, currentPlayer, gameShouldStart, showAdmin, showRoomManager])

  useEffect(() => {
    if (isNotFoundError) {
      setNotFoundRoomCode(prefilledRoomCode)
    }
  }, [isNotFoundError, prefilledRoomCode])

  useEffect(() => {
    const lang = language as 'en' | 'es'
    document.title = TITLES[view]?.[lang] || TITLES.rooms[lang]
    document.documentElement.lang = lang

    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      const descriptions: Record<string, { en: string; es: string }> = {
        auth: {
          en: 'Sign in to Scrum Poker to create and join planning poker rooms.',
          es: 'Inicia sesión en Scrum Poker para crear y unirte a salas de poker de planificación.',
        },
        dashboard: {
          en: 'Manage your Scrum Poker rooms and join planning sessions.',
          es: 'Administra tus salas de Scrum Poker y únete a sesiones de planificación.',
        },
        rooms: {
          en: 'Free real-time planning poker app for agile teams. Vote on story points with Fibonacci or hours estimation.',
          es: 'App gratuita de poker de planificación en tiempo real para equipos ágiles. Vota story points con Fibonacci o horas.',
        },
        lobby: {
          en: `Room ${currentRoom?.code || ''} - Waiting for players to join`,
          es: `Sala ${currentRoom?.code || ''} - Esperando jugadores`,
        },
        game: {
          en: `Room ${currentRoom?.code || ''} - Vote for story points`,
          es: `Sala ${currentRoom?.code || ''} - Vota los story points`,
        },
      }
      metaDesc.setAttribute('content', descriptions[view]?.[lang] || descriptions.rooms[lang])
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
    leaveRoom()
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

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore logout errors
    }
    disconnectSocket()
    clearAuth()
    reset()
    setShowRoomManager(false)
    setShowAdmin(false)
    setPrefilledRoomCode(null)
    setNotFoundRoomCode(null)
    clearStoreError(null)
    useGameStore.getState().setWasKicked(false)
    clearError()
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.toString())
  }

  const handleGoHome = () => {
    setNotFoundRoomCode(null)
    setPrefilledRoomCode(null)
    clearStoreError(null)
    useGameStore.getState().setWasKicked(false)
    clearError()
    reset()
    setShowRoomManager(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.toString())
  }

  const handleDashboardCreate = () => {
    setShowRoomManager(true)
  }

  const handleDashboardJoin = (code?: string) => {
    if (code) {
      setPrefilledRoomCode(code)
    }
    setShowRoomManager(true)
  }

  const handleRoomManagerBack = () => {
    setShowRoomManager(false)
    setPrefilledRoomCode(null)
    clearError()
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {view === 'loading' && (
          <motion.div
            key="loading"
            className="room-manager"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="logo">
              <span className="logo-icon">♠</span>
              <span className="logo-text">SCRUM POKER</span>
            </div>
          </motion.div>
        )}
        {view === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <AuthScreen />
          </motion.div>
        )}
        {view === 'dashboard' && user && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Dashboard
              onCreateRoom={handleDashboardCreate}
              onJoinRoom={handleDashboardJoin}
              onAdmin={() => setShowAdmin(true)}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
        {view === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <AdminPanel onBack={() => setShowAdmin(false)} />
          </motion.div>
        )}
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
              onBack={handleRoomManagerBack}
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
