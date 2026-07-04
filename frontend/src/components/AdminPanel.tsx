import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { roomsApi, usersApi } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { t } from '../i18n'

interface ApiUser {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

interface ApiRoom {
  id: string
  code: string
  estimation_type: string
  is_started: number
  owner_id: string | null
  created_at: string
}

interface AdminPanelProps {
  onBack: () => void
}

function formatDate(dateStr: string, lang: 'en' | 'es'): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const { language } = useGameStore()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [rooms, setRooms] = useState<ApiRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersData, roomsData] = await Promise.all([
        usersApi.all() as Promise<ApiUser[]>,
        roomsApi.all() as Promise<ApiRoom[]>,
      ])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setRooms(Array.isArray(roomsData) ? roomsData : [])
    } catch {
      setUsers([])
      setRooms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getOwnerName = (ownerId: string | null): string => {
    if (!ownerId) return '—'
    const owner = users.find((u) => u.id === ownerId)
    return owner ? `${owner.name} (${owner.email})` : ownerId.slice(0, 8)
  }

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm(t('confirmDeleteRoom', language))) return
    setDeletingId(id)
    try {
      await roomsApi.delete(id)
      setRooms((prev) => prev.filter((r) => r.id !== id))
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="room-manager admin-panel">
      <motion.div
        className="admin-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button type="button" className="back-btn" onClick={onBack}>
          {t('back', language)}
        </button>

        <h2 className="admin-title">{t('adminPanel', language)}</h2>

        {loading ? (
          <p className="dashboard-empty">{t('reconnecting', language)}</p>
        ) : (
          <>
            <section className="admin-section">
              <h3>{t('allUsers', language)}</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('name', language)}</th>
                      <th>{t('email', language)}</th>
                      <th>{t('role', language)}</th>
                      <th>{t('createdAt', language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>{formatDate(user.created_at, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-section">
              <h3>{t('allRooms', language)}</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('roomCode', language)}</th>
                      <th>{t('owner', language)}</th>
                      <th>{t('estimationType', language)}</th>
                      <th>{t('started', language)}</th>
                      <th>{t('createdAt', language)}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room.id}>
                        <td className="mono">{room.code}</td>
                        <td>{getOwnerName(room.owner_id)}</td>
                        <td>
                          {room.estimation_type === 'hours'
                            ? t('hours', language)
                            : t('fibonacci', language)}
                        </td>
                        <td>{room.is_started ? t('yes', language) : t('no', language)}</td>
                        <td>{formatDate(room.created_at, language)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-small admin-delete-btn"
                            disabled={deletingId === room.id}
                            onClick={() => handleDeleteRoom(room.id)}
                          >
                            {t('deleteRoom', language)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </motion.div>
    </div>
  )
}
