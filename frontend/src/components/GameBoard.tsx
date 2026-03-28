import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type EstimationType } from './RoomManager'

interface GameBoardProps {
  roomCode: string
  playerName: string
  players: { id: string; name: string; isHost: boolean; hasVoted: boolean; vote?: string }[]
  estimationType: EstimationType
  onLeaveGame: () => void
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

export function GameBoard({ roomCode, playerName, players, estimationType, onLeaveGame }: GameBoardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const isHost = players.find(p => p.name === playerName)?.isHost || false
  const cards = estimationType === 'fibonacci' ? FIBONACCI_CARDS : HOURS_CARDS

  const handleReveal = () => {
    setRevealed(true)
  }

  const handleReset = () => {
    setSelected(null)
    setRevealed(false)
  }

  const handleLeave = () => {
    setSelected(null)
    setRevealed(false)
    onLeaveGame()
  }

  const handleSelectCard = (card: string) => {
    setSelected(card)
  }

  return (
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
          Exit
        </motion.button>
        <div className="room-info">
          <span className="room-label">ROOM</span>
          <span className="room-code">{roomCode}</span>
        </div>
        <div className="mode-badge">
          {estimationType === 'fibonacci' ? '🌰 Fibonacci' : '⏱ Hours'}
        </div>
        {isHost && (
          <motion.button 
            className="btn btn-small" 
            onClick={handleReset}
            disabled={!revealed}
            whileHover={!revealed ? {} : { scale: 1.02 }}
            whileTap={!revealed ? {} : { scale: 0.98 }}
          >
            NEW ROUND
          </motion.button>
        )}
      </header>

      <main className="game-main">
        <motion.div 
          className="votes-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {players.map((player) => (
            <motion.div 
              key={player.id} 
              className={`vote-card ${player.hasVoted ? 'voted' : ''} ${revealed ? 'revealed' : ''}`}
              variants={playerCardVariants}
              layout
            >
              <motion.span 
                className="vote-avatar"
                animate={{ 
                  backgroundColor: player.hasVoted ? 'var(--accent)' : 'var(--text-muted)'
                }}
                transition={{ duration: 0.3 }}
              >
                {player.name.charAt(0).toUpperCase()}
              </motion.span>
              <span className="vote-name">{player.name}</span>
              <AnimatePresence mode="wait">
                <motion.span 
                  key={revealed ? 'revealed' : 'hidden'}
                  className="vote-value"
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 90 }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                >
                  {revealed && player.vote ? player.vote : (player.hasVoted ? '?' : '-')}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div 
              key="selection"
              className="card-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <p className="selection-hint">Select your estimation</p>
              <motion.div 
                className="cards"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {cards.map((card) => (
                  <motion.button
                    key={card}
                    className={`card ${selected === card ? 'selected' : ''}`}
                    onClick={() => handleSelectCard(card)}
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
                key={selected || 'none'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {selected ? (
                  <p>You chose <span className="highlight">{selected}</span></p>
                ) : (
                  <p>Tap a card to vote</p>
                )}
              </motion.div>
              <motion.button 
                className="btn btn-primary btn-large" 
                onClick={() => setRevealed(true)}
                disabled={!selected}
                whileHover={selected ? { scale: 1.02 } : {}}
                whileTap={selected ? { scale: 0.98 } : {}}
              >
                SUBMIT VOTE
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              key="reveal"
              className="reveal-section"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <motion.p 
                className="reveal-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                All votes are in!
              </motion.p>
              {isHost && (
                <motion.button 
                  className="btn btn-primary btn-large" 
                  onClick={handleReveal}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  REVEAL ALL
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="game-footer">
        <div className="votes-status">
          <motion.span
            key={players.filter(p => p.hasVoted).length}
            initial={{ scale: 1.2, color: 'var(--accent)' }}
            animate={{ scale: 1, color: 'var(--text-muted)' }}
            transition={{ duration: 0.3 }}
          >
            {players.filter(p => p.hasVoted).length} / {players.length} voted
          </motion.span>
        </div>
      </footer>
    </div>
  )
}
