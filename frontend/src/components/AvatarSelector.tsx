import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../hooks/useGameStore'
import { t } from '../i18n'
import './AvatarSelector.css'

interface AvatarSelectorProps {
  selectedAvatar: string
  onSelect: (avatar: string) => void
}

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD 
    ? `${window.location.protocol}//${window.location.host}` 
    : 'http://localhost:3000'
)

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function AvatarSelector({ selectedAvatar, onSelect }: AvatarSelectorProps) {
  const { language } = useGameStore()
  const [allAvatars, setAllAvatars] = useState<string[]>([])
  const [displayedAvatars, setDisplayedAvatars] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)

  const loadAvatars = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/avatars`)
      const avatars: string[] = await res.json()
      setAllAvatars(avatars)
      setDisplayedAvatars(shuffle(avatars).slice(0, 4))
    } catch {
      setAllAvatars([])
      setDisplayedAvatars([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAvatars()
  }, [loadAvatars])

  const handleRefresh = () => {
    if (allAvatars.length === 0) return
    const remaining = allAvatars.filter(a => !displayedAvatars.includes(a))
    if (remaining.length >= 4) {
      setDisplayedAvatars(shuffle(remaining).slice(0, 4))
    } else if (remaining.length > 0) {
      const shuffled = shuffle(remaining)
      const picked = shuffled.slice(0, remaining.length)
      const needed = 4 - picked.length
      const pool = allAvatars.filter(a => !remaining.includes(a))
      picked.push(...shuffle(pool).slice(0, needed))
      setDisplayedAvatars(shuffle(picked))
    } else {
      setDisplayedAvatars(shuffle(allAvatars).slice(0, 4))
    }
  }

  if (loading) return <div className="avatar-selector"><div className="avatar-label">{t('selectAvatar', language)}</div></div>

  return (
    <div className="avatar-selector">
      <label className="avatar-label">{t('selectAvatar', language)}</label>
      <div className="avatar-grid">
        {displayedAvatars.map((avatar) => (
          <motion.button
            key={avatar}
            type="button"
            className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
            onClick={() => onSelect(avatar)}
            onDoubleClick={() => setPreviewAvatar(avatar)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img 
              src={`/characters/${avatar}`} 
              alt={avatar}
              className="avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </motion.button>
        ))}
      </div>
      <motion.button
        type="button"
        className="refresh-avatars-btn"
        onClick={handleRefresh}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={language === 'es' ? 'Ver más avatares' : 'Show more avatars'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </motion.button>

      <AnimatePresence>
        {previewAvatar && (
          <motion.div
            className="avatar-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewAvatar(null)}
          >
            <motion.div
              className="avatar-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`/characters/${previewAvatar}`}
                alt={previewAvatar}
                className="avatar-modal-img"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
