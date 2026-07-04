import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { roomsApi } from '../lib/api'
import { useAuthStore, type AuthUser } from '../hooks/useAuthStore'
import { useGameStore } from '../hooks/useGameStore'
import { t } from '../i18n'

interface ApiRoom {
  id: string
  code: string
  estimation_type: string
  is_started: number
  created_at: string
}

type DashboardTab = 'mine' | 'joined'

interface DashboardProps {
  onCreateRoom: () => void
  onJoinRoom: (code?: string) => void
  onAdmin: () => void
  onLogout: () => void
}

function formatDate(dateStr: string, lang: 'en' | 'es'): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function RoomCard({
  room,
  language,
  onJoin,
}: {
  room: ApiRoom
  language: 'en' | 'es'
  onJoin: (code: string) => void
}) {
  const estimationLabel =
    room.estimation_type === 'hours' ? t('hours', language) : t('fibonacci', language)

  return (
    <motion.div
      className="dashboard-room-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="dashboard-room-info">
        <span className="dashboard-room-code">{room.code}</span>
        <span className="dashboard-room-meta">
          {t('estimationType', language)}: {estimationLabel}
        </span>
        <span className="dashboard-room-meta">
          {t('createdAt', language)}: {formatDate(room.created_at, language)}
        </span>
      </div>
      <button
        type="button"
        className="btn btn-small"
        onClick={() => onJoin(room.code)}
      >
        {t('join', language)}
      </button>
    </motion.div>
  )
}

export function Dashboard({ onCreateRoom, onJoinRoom, onAdmin, onLogout }: DashboardProps) {
  const user = useAuthStore((s) => s.user) as AuthUser
  const { language, toggleLanguage } = useGameStore()
  const [tab, setTab] = useState<DashboardTab>('mine')
  const [myRooms, setMyRooms] = useState<ApiRoom[]>([])
  const [joinedRooms, setJoinedRooms] = useState<ApiRoom[]>([])
  const [loading, setLoading] = useState(true)

  const loadRooms = useCallback(async () => {
    setLoading(true)
    try {
      const [mine, participated] = await Promise.all([
        roomsApi.mine() as Promise<ApiRoom[]>,
        roomsApi.participated() as Promise<ApiRoom[]>,
      ])
      setMyRooms(Array.isArray(mine) ? mine : [])
      setJoinedRooms(Array.isArray(participated) ? participated : [])
    } catch {
      setMyRooms([])
      setJoinedRooms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  const rooms = tab === 'mine' ? myRooms : joinedRooms
  const emptyMessage = tab === 'mine' ? t('noRoomsYet', language) : t('noJoinedRoomsYet', language)

  return (
    <div className="room-manager dashboard">
      <motion.div
        className="logo"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="logo-icon">♠</span>
        <span className="logo-text">SCRUM POKER</span>
      </motion.div>

      <motion.button
        className="lang-toggle"
        onClick={toggleLanguage}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {language === 'en' ? 'ES' : 'EN'}
      </motion.button>

      <div className="dashboard-container">
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="dashboard-user">
            <h2>{t('welcome', language)}, {user.name}</h2>
            <p className="dashboard-email">{user.email}</p>
          </div>
          <div className="dashboard-header-actions">
            {user.role === 'god' && (
              <button type="button" className="btn btn-secondary" onClick={onAdmin}>
                {t('adminPanel', language)}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onLogout}>
              {t('logoutButton', language)}
            </button>
          </div>
        </motion.div>

        <motion.div
          className="dashboard-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <button type="button" className="btn btn-primary" onClick={onCreateRoom}>
            {t('createRoomButton', language)}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onJoinRoom()}>
            {t('joinRoomButton', language)}
          </button>
        </motion.div>

        <div className="dashboard-tabs">
          <button
            type="button"
            className={`dashboard-tab ${tab === 'mine' ? 'active' : ''}`}
            onClick={() => setTab('mine')}
          >
            {t('myRooms', language)}
          </button>
          <button
            type="button"
            className={`dashboard-tab ${tab === 'joined' ? 'active' : ''}`}
            onClick={() => setTab('joined')}
          >
            {t('joinedRooms', language)}
          </button>
        </div>

        <div className="dashboard-room-list">
          {loading ? (
            <p className="dashboard-empty">{t('reconnecting', language)}</p>
          ) : rooms.length === 0 ? (
            <p className="dashboard-empty">{emptyMessage}</p>
          ) : (
            <AnimatePresence mode="popLayout">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  language={language}
                  onJoin={(code) => onJoinRoom(code)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
