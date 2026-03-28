import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Room, type Player } from '../hooks/useGameStore'
import { useGameStore } from '../hooks/useGameStore'
import { t } from '../i18n'
import { ConfirmDialog } from './ConfirmDialog'

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

export function GameBoard({ room, player, onLeaveGame, onSubmitVote, onReveal, onReset }: GameBoardProps) {
  const { language, toggleLanguage, clearLocalVote, triggerClearLocalVote } = useGameStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [localSelectedVote, setLocalSelectedVote] = useState<string | undefined>(player.vote)
  const selectedVote = localSelectedVote || player.vote
  const cards = room.estimationType === 'fibonacci' ? FIBONACCI_CARDS : HOURS_CARDS
  const average = calculateAverage(room.players.map(p => p.vote))

  useEffect(() => {
    if (clearLocalVote) {
      setLocalSelectedVote(undefined)
      triggerClearLocalVote()
    }
  }, [clearLocalVote])

  useEffect(() => {
    setLocalSelectedVote(player.vote)
  }, [player.vote])

  const handleVote = (vote: string) => {
    setLocalSelectedVote(vote)
    onSubmitVote(vote)
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
              <motion.span 
                className="vote-avatar"
                animate={{ 
                  backgroundColor: p.hasVoted ? 'var(--accent)' : 'var(--text-muted)'
                }}
                transition={{ duration: 0.3 }}
              >
                {p.name.charAt(0).toUpperCase()}
              </motion.span>
              <span className="vote-name">
                {p.name}
                {p.id === player.id && <span className="you-indicator">({t('you', language)})</span>}
              </span>
              <span className="vote-status-badge">
                {p.hasVoted ? '✓' : '○'}
              </span>
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
              {player.isHost && room.players.every(p => p.hasVoted) && (
                <motion.button 
                  className="btn btn-primary btn-large" 
                  onClick={onReveal}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('revealAll', language)}
                </motion.button>
              )}
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
      </footer>
    </div>

    <ConfirmDialog
      isOpen={showConfirm}
      title={t('exit', language)}
      message={t('confirmExit', language)}
      onConfirm={handleConfirmExit}
      onCancel={() => setShowConfirm(false)}
    />
    </>
  )
}
