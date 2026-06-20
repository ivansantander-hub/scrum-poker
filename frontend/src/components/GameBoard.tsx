import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Room, type Player } from '../hooks/useGameStore'
import { useGameStore } from '../hooks/useGameStore'
import { useSocket } from '../hooks/useSocket'
import { t } from '../i18n'
import { ConfirmDialog } from './ConfirmDialog'
import { AvatarPreviewModal } from './AvatarPreviewModal'
import { RoundHistoryPanel } from './RoundHistory'
import { SessionReport } from './SessionReport'
import { soundManager } from '../utils/sound'

interface GameBoardProps {
  room: Room
  player: Player
  onLeaveGame: () => void
  onSubmitVote: (vote: string) => void
  onReveal: () => void
  onReset: () => void
}

const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', '☕']
const HOURS_CARDS = ['1h', '2h', '4h', '8h', '12h', '16h', '20h', '24h', '32h', '40h', '?', '☕']

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 20 }
  }
}

const playerCardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
  }
}

function calculateAverage(votes: (string | undefined)[]): string {
  const validVotes = votes
    .filter(v => v && v !== '?' && v !== '☕')
    .map(v => {
      if (v?.endsWith('h')) {
        return parseInt(v.replace('h', ''))
      }
      return parseInt(v || '0')
    })
    .filter(n => !isNaN(n))
  
  if (validVotes.length === 0) return '-'
  
  const avg = validVotes.reduce((a, b) => a + b, 0) / validVotes.length
  return Number.isInteger(avg) ? avg.toString() : avg.toFixed(1)
}

function PlayerAvatar({ name, avatar, hasVoted, onDoubleClick }: { name: string; avatar: string; hasVoted: boolean; onDoubleClick?: () => void }) {
  const [imgError, setImgError] = useState(false)
  const avatarSrc = `/characters/${avatar || 'vincent.webp'}`
  
  return (
    <div className="vote-avatar-wrapper" onDoubleClick={onDoubleClick}>
      {!imgError && (
        <img 
          src={avatarSrc}
          alt={name}
          className="vote-avatar-img"
          onError={() => setImgError(true)}
        />
      )}
      <motion.span 
        className="vote-avatar-initial"
        animate={{ 
          backgroundColor: hasVoted ? 'var(--accent)' : 'var(--text-muted)'
        }}
        transition={{ duration: 0.3 }}
        style={{ display: imgError ? 'flex' : 'none' }}
      >
        {name.charAt(0).toUpperCase()}
      </motion.span>
    </div>
  )
}

export function GameBoard({ room, player, onLeaveGame, onSubmitVote, onReveal, onReset }: GameBoardProps) {
  const { language, toggleLanguage, clearLocalVote, triggerClearLocalVote } = useGameStore()
  const { getRoundHistory, getSessionStats, showSessionReport, closeSessionReport, kickPlayer } = useSocket()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showKickConfirm, setShowKickConfirm] = useState<{ show: boolean; playerId: string; playerName: string } | null>(null)
  const [customHourInput, setCustomHourInput] = useState('')
  const [localSelectedVote, setLocalSelectedVote] = useState<string | undefined>(player.vote)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled())
  const selectedVote = localSelectedVote || player.vote
  const cards = room.estimationType === 'fibonacci' ? FIBONACCI_CARDS : HOURS_CARDS
  const average = calculateAverage(room.players.map(p => p.vote))

  const handleShowReport = () => {
    console.log('Show report clicked, requesting session stats...')
    getSessionStats(room.code)
  }

  useEffect(() => {
    getRoundHistory(room.code)
  }, [room.code])

  useEffect(() => {
    if (clearLocalVote) {
      setLocalSelectedVote(undefined)
      triggerClearLocalVote()
      soundManager.playReset()
    }
  }, [clearLocalVote])

  useEffect(() => {
    setLocalSelectedVote(player.vote)
  }, [player.vote])

  const handleVote = (vote: string) => {
    setLocalSelectedVote(vote)
    onSubmitVote(vote)
    setCustomHourInput('')
    soundManager.playVote()
  }

  const handleCustomHourSubmit = () => {
    const trimmed = customHourInput.trim()
    if (!trimmed) return
    const normalized = trimmed.endsWith('h') ? trimmed : `${trimmed}h`
    if (/^\d+(\.\d+)?h$/.test(normalized)) {
      handleVote(normalized)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts when custom input is focused
      if (document.activeElement?.tagName === 'INPUT') return

      // Space to reveal (host only, when at least 2 votes)
      if (e.code === 'Space' && player.isHost && !room.isRevealed && room.players.filter(p => p.hasVoted).length >= 2) {
        e.preventDefault()
        onReveal()
        soundManager.enable() // Ensure audio context is ready
        soundManager.playReveal()
      }

      // Number keys to vote
      if (!room.isRevealed) {
        const key = e.key
        const numValue = parseInt(key)
        
        if (!isNaN(numValue)) {
          let cardValue: string | null = null
          
          if (room.estimationType === 'fibonacci') {
            // Map number keys to Fibonacci values
            const fibMap: Record<number, string> = {
              0: '0', 1: '1', 2: '2', 3: '3', 4: '5', 
              5: '8', 6: '13', 7: '21', 8: '34'
            }
            if (fibMap[numValue]) {
              cardValue = fibMap[numValue]
            }
          } else {
            // Map number keys to hours values
            const hourMap: Record<number, string> = {
              1: '1h', 2: '2h', 3: '4h', 4: '8h', 
              5: '12h', 6: '16h', 7: '20h', 8: '24h'
            }
            if (hourMap[numValue]) {
              cardValue = hourMap[numValue]
            }
          }
          
          // Special keys for ? and coffee
          if (key === 'q' || key === 'Q') cardValue = '?'
          if (key === 'c' || key === 'C') cardValue = '☕'
          
          if (cardValue && cards.includes(cardValue)) {
            handleVote(cardValue)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [room, player, cards, onReveal, handleVote])

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

  const handleLeave = () => {
    setShowConfirm(true)
  }

  const handleConfirmExit = () => {
    setShowConfirm(false)
    onLeaveGame()
  }

  return (
    <>
    <div className="game-board">
      <header className="game-header">
        <motion.button 
          className="btn-icon" 
          onClick={handleLeave}
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
        <div className="room-info">
          <span className="room-label">{t('room', language)}</span>
          <span className="room-code">{room.code}</span>
        </div>
        <div className="mode-badge">
          {room.estimationType === 'fibonacci' ? `🌰 ${t('fibonacci', language)}` : `⏱ ${t('hours', language)}`}
        </div>
        {room.isRevealed && (
          <motion.button 
            className="btn btn-small" 
            onClick={onReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('newRound', language)}
          </motion.button>
        )}
        <motion.button
          className="lang-toggle-small"
          onClick={toggleLanguage}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {language === 'en' ? 'ES' : 'EN'}
        </motion.button>
        <motion.button
          className="lang-toggle-small"
          onClick={() => {
            const newState = soundManager.toggle()
            setSoundEnabled(newState)
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </motion.button>
      </header>

      <main className="game-main">
        <motion.div 
          className="votes-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {room.players.map((p) => (
            <motion.div 
              key={p.id} 
              className={`vote-card ${p.hasVoted ? 'voted' : ''}`}
              variants={playerCardVariants}
              layout
            >
              <PlayerAvatar name={p.name} avatar={p.avatar} hasVoted={p.hasVoted} onDoubleClick={() => setPreviewAvatar(p.avatar)} />
              <span className="vote-name">
                {p.name}
                {p.id === player.id && <span className="you-indicator">({t('you', language)})</span>}
              </span>
              <span className={`vote-status-badge ${room.isRevealed && !p.hasVoted ? 'no-vote' : ''}`}>
                {room.isRevealed && !p.hasVoted ? (
                  <motion.span
                    className="no-vote-x"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    ✕
                  </motion.span>
                ) : (
                  p.hasVoted ? '✓' : '○'
                )}
              </span>
              {player.isHost && p.id !== player.id && (
                <motion.button
                  className="kick-btn"
                  onClick={() => handleKickClick(p)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={t('kickPlayer', language)}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4l5 5-5 5"/>
                    <line x1="11" y1="9" x2="23" y2="9"/>
                  </svg>
                </motion.button>
              )}
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {!room.isRevealed ? (
            <motion.div 
              key="selection"
              className="card-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <p className="selection-hint">{t('selectEstimation', language)}</p>
              <motion.div 
                className="cards"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {cards.map((card) => (
                  <motion.button
                    key={card}
                    className={`card ${selectedVote === card ? 'selected' : ''}`}
                    onClick={() => handleVote(card)}
                    variants={cardVariants}
                    whileHover={{ y: -8, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    layout
                  >
                    <span className="card-value">{card}</span>
                  </motion.button>
                ))}
              </motion.div>
              {room.estimationType === 'hours' && (
                <motion.div
                  className="custom-hours-input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <span className="custom-hours-divider">{t('or', language)}</span>
                  <div className="custom-hours-field">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="hours-input"
                      placeholder={t('customHoursPlaceholder', language)}
                      value={customHourInput}
                      onChange={(e) => setCustomHourInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomHourSubmit()
                        }
                      }}
                      disabled={!!selectedVote}
                    />
                    <motion.button
                      className="btn btn-small hours-submit"
                      onClick={handleCustomHourSubmit}
                      disabled={!!selectedVote || !customHourInput.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t('customHoursSubmit', language)}
                    </motion.button>
                  </div>
                </motion.div>
              )}
              <motion.div 
                className="selection-status"
                key={selectedVote || 'none'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {selectedVote ? (
                  <p>{t('youChose', language)} <span className="highlight">{selectedVote}</span></p>
                ) : (
                  <p>{t('tapCardToVote', language)}</p>
                )}
              </motion.div>
              {selectedVote && (
                <motion.div
                  className="voted-indicator"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>{t('voteSubmitted', language)}</span>
                </motion.div>
              )}
              {player.isHost && room.players.filter(p => p.hasVoted).length >= 2 && (
                <motion.button 
                  className="btn btn-primary btn-large" 
                  onClick={onReveal}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('revealAll', language)} ({room.players.filter(p => p.hasVoted).length}/{room.players.length})
                </motion.button>
              )}
              <p className="shortcuts-hint">{t('shortcutsHint', language)}</p>
            </motion.div>
          ) : (
            <motion.div 
              key="reveal"
              className="reveal-section"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring' as const, stiffness: 200, damping: 20 }}
            >
              <motion.h2 
                className="revealed-title"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {t('results', language)}
              </motion.h2>
              <div className="average-card">
                <span className="average-label">{t('average', language)}</span>
                <span className="average-value">{average}</span>
              </div>
              <div className="votes-reveal-grid">
                {room.players.map((p) => (
                  <div key={p.id} className="vote-reveal-item">
                    <span className="vote-reveal-name">{p.name}</span>
                    <span className="vote-reveal-value">{p.vote || '-'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="game-footer">
        <div className="votes-status">
          <motion.span
            key={room.players.filter(p => p.hasVoted).length}
            initial={{ scale: 1.2, color: 'var(--accent)' }}
            animate={{ scale: 1, color: 'var(--text-muted)' }}
            transition={{ duration: 0.3 }}
          >
            {room.players.filter(p => p.hasVoted).length} / {room.players.length} {t('voted', language)}
          </motion.span>
        </div>
        <div className="footer-actions">
          <button 
            className="btn btn-small"
            onClick={() => setShowHistory(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{t('history', language)}</span>
          </button>
          <button 
            className="btn btn-small btn-secondary"
            onClick={handleShowReport}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>{t('report', language)}</span>
          </button>
        </div>
      </footer>
    </div>

    <ConfirmDialog
      isOpen={showConfirm}
      title={t('exit', language)}
      message={t('confirmExit', language)}
      onConfirm={handleConfirmExit}
      onCancel={() => setShowConfirm(false)}
    />

    <ConfirmDialog
      isOpen={showKickConfirm?.show || false}
      title={t('kickPlayer', language)}
      message={language === 'en'
        ? `Are you sure you want to remove ${showKickConfirm?.playerName || ''} from the room?`
        : `¿Estás seguro de que quieres expulsar a ${showKickConfirm?.playerName || ''} de la sala?`}
      onConfirm={confirmKick}
      onCancel={() => setShowKickConfirm(null)}
    />
    <AvatarPreviewModal avatar={previewAvatar} onClose={() => setPreviewAvatar(null)} />
    <RoundHistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
    <AnimatePresence>
      {showSessionReport && (
        <SessionReport showSessionReport={showSessionReport} onClose={closeSessionReport} />
      )}
    </AnimatePresence>
    </>
  )
}
