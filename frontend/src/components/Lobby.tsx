import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Room, type Player } from '../hooks/useGameStore'
import { useGameStore } from '../hooks/useGameStore'
import { useSocket } from '../hooks/useSocket'
import { t } from '../i18n'
import { ConfirmDialog } from './ConfirmDialog'
import { AvatarPreviewModal } from './AvatarPreviewModal'
import './AvatarSelector.css'

interface LobbyProps {
  room: Room
  player: Player
  onStartGame: () => void
  onJoinGame: () => void
  onLeaveRoom: () => void
}

const playerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({ 
    opacity: 1, 
    x: 0,
    transition: { 
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 300,
      damping: 25
    }
  }),
  exit: { opacity: 0, x: -20, scale: 0.9 }
}

export function Lobby({ room, player, onStartGame, onJoinGame, onLeaveRoom }: LobbyProps) {
  const { language, toggleLanguage } = useGameStore()
  const { kickPlayer, error, clearError } = useSocket()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
  const [showKickConfirm, setShowKickConfirm] = useState<{ show: boolean; playerId: string; playerName: string } | null>(null)
  const isHost = player.isHost
  const gameAlreadyStarted = room.isStarted

  const handleKickClick = (targetPlayer: Player) => {
    if (targetPlayer.id === player.id) return
    setShowKickConfirm({ show: true, playerId: targetPlayer.id, playerName: targetPlayer.name })
  }

  const confirmKick = () => {
    if (showKickConfirm) {
      kickPlayer(showKickConfirm.playerId)
      setShowKickConfirm(null)
    }
  }

  const getShareUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('room', room.code)
    return url.toString()
  }

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(room.code)
    setShowShareMenu(false)
  }

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(getShareUrl())
    setShowShareMenu(false)
  }

  const handleLeaveClick = () => {
    setShowConfirm(true)
  }

  const handleConfirmExit = () => {
    setShowConfirm(false)
    onLeaveRoom()
  }

  return (
    <>
      <div className="lobby">
        <header className="lobby-header">
          <motion.button 
            className="btn-icon" 
            onClick={handleLeaveClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t('exit', language)}
          </motion.button>
          <motion.div 
            className="room-badge"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="badge-label">{t('room', language)}</span>
            <motion.span 
              className="badge-code" 
              onClick={() => setShowShareMenu(true)} 
              title="Click to copy"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {room.code}
            </motion.span>
          </motion.div>
          <motion.button
            className="lang-toggle-small"
            onClick={toggleLanguage}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {language === 'en' ? 'ES' : 'EN'}
          </motion.button>
        </header>

        <main className="lobby-main">
          <motion.div 
            className="room-info-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="info-row">
              <span className="info-label">{t('mode', language)}</span>
              <span className="info-value">
                {room.estimationType === 'fibonacci' ? `🌰 ${t('fibonacci', language)}` : `⏱ ${t('hours', language)}`}
              </span>
            </div>
          </motion.div>

          <div className="players-section">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t('players', language)} <span className="count">({room.players.length})</span>
            </motion.h2>
            <ul className="players-list">
              <AnimatePresence>
                {room.players.map((p, i) => (
                  <motion.li
                    key={p.id}
                    className={`player ${p.hasVoted ? 'voted' : ''}`}
                    custom={i}
                    variants={playerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <div className="player-avatar-wrapper" onDoubleClick={() => setPreviewAvatar(p.avatar)}>
                      <img 
                        src={`/characters/${p.avatar || 'vincent.webp'}`}
                        alt={p.name}
                        className="player-avatar-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                    <span className="player-name">
                      {p.name}
                      {p.isHost && <span className="host-badge">{t('host', language)}</span>}
                      {p.id === player.id && <span className="you-badge">{t('you', language)}</span>}
                    </span>
                    {isHost && p.id !== player.id && (
                      <motion.button
                        className="kick-btn"
                        onClick={() => handleKickClick(p)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={t('kickPlayer', language)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 4l5 5-5 5"/>
                          <line x1="11" y1="9" x2="23" y2="9"/>
                        </svg>
                        {t('kickPlayer', language)}
                      </motion.button>
                    )}
                    {!isHost && (
                      <motion.span 
                        className="vote-status"
                        animate={{ 
                          color: p.hasVoted ? 'var(--success)' : 'var(--text-muted)',
                          scale: p.hasVoted ? [1, 1.2, 1] : 1
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {p.hasVoted ? '✓' : '○'}
                      </motion.span>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>

          <AnimatePresence mode="wait">
            {gameAlreadyStarted ? (
              <motion.div 
                key="join"
                className="start-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.3 }}
              >
                <p className="hint">{t('gameAlreadyStarted', language)}</p>
                <motion.button 
                  className="btn btn-primary btn-large" 
                  onClick={onJoinGame}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px var(--accent-glow)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('joinGame', language)}
                </motion.button>
              </motion.div>
            ) : isHost ? (
              <motion.div 
                key="start"
                className="start-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.3 }}
              >
                <p className="hint">{t('whenAllReadyStart', language)}</p>
                <motion.button 
                  className="btn btn-primary btn-large" 
                  onClick={onStartGame}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px var(--accent-glow)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('startGame', language)}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div 
                key="waiting"
                className="waiting-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.3 }}
              >
                <p className="hint">{t('waitingHostStart', language)}</p>
                <motion.div 
                  className="loader"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="lobby-footer">
          <motion.button 
            className="btn btn-ghost" 
            onClick={() => setShowShareMenu(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {t('shareRoomCode', language)}
          </motion.button>
        </footer>
      </div>

      {error && (
        <motion.div
          className="error-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <span>{error}</span>
          <button className="error-close" onClick={clearError}>✕</button>
        </motion.div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title={t('exit', language)}
        message={t('confirmExit', language)}
        onConfirm={handleConfirmExit}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showKickConfirm?.show || false}
        title={language === 'en' ? 'Remove Player' : 'Expulsar Jugador'}
        message={language === 'en' 
          ? `Are you sure you want to remove ${showKickConfirm?.playerName || ''} from the room?`
          : `¿Estás seguro de que quieres expulsar a ${showKickConfirm?.playerName || ''} de la sala?`}
        onConfirm={confirmKick}
        onCancel={() => { setShowKickConfirm(null); clearError() }}
      />

      {showShareMenu && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowShareMenu(false)}
        >
          <motion.div
            className="share-menu"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="share-menu-title">{t('shareRoomCode', language)}</h3>
            <button className="share-menu-item" onClick={copyCodeToClipboard}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>{t('copyCode', language)}</span>
            </button>
            <button className="share-menu-item" onClick={copyLinkToClipboard}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>{t('copyLink', language)}</span>
            </button>
          </motion.div>
        </motion.div>
      )}
      <AvatarPreviewModal avatar={previewAvatar} onClose={() => setPreviewAvatar(null)} />
    </>
  )
}
