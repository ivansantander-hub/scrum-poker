import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../hooks/useGameStore'
import { t } from '../i18n'

export type EstimationType = 'fibonacci' | 'hours'

interface RoomManagerProps {
  onCreateRoom: (roomCode: string, hostName: string, estimationType: EstimationType) => void
  onJoinRoom: (roomCode: string, playerName: string) => void
  error: string | null
  onClearError: () => void
  prefilledRoomCode?: string | null
}

const panelVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
  },
  exit: { opacity: 0, x: -30 }
}

const buttonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ 
    opacity: 1, 
    y: 0,
    transition: { delay: i * 0.1 }
  })
}

export function RoomManager({ onCreateRoom, onJoinRoom, error, onClearError, prefilledRoomCode }: RoomManagerProps) {
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>(() => prefilledRoomCode ? 'join' : 'choice')
  const [roomCode, setRoomCode] = useState(prefilledRoomCode || '')
  const [playerName, setPlayerName] = useState('')
  const [estimationType, setEstimationType] = useState<EstimationType>('fibonacci')
  const [localError, setLocalError] = useState('')
  const { language, toggleLanguage } = useGameStore()

  useEffect(() => {
    if (prefilledRoomCode) {
      setRoomCode(prefilledRoomCode)
      setMode('join')
    }
  }, [prefilledRoomCode])

  const handleCreate = () => {
    if (!playerName.trim()) {
      setLocalError(t('enterYourName', language))
      return
    }
    const code = 'TMP'
    onCreateRoom(code, playerName.trim(), estimationType)
  }

  const handleJoin = () => {
    if (!playerName.trim()) {
      setLocalError(t('enterYourName', language))
      return
    }
    if (roomCode.length !== 6) {
      setLocalError(t('roomCodeMustBe6', language))
      return
    }
    onJoinRoom(roomCode.toUpperCase(), playerName.trim())
  }

  const resetForm = () => {
    setMode('choice')
    setLocalError('')
    setPlayerName('')
    setRoomCode('')
    setEstimationType('fibonacci')
    onClearError()
  }

  const displayError = localError || error

  return (
    <div className="room-manager">
      <motion.div 
        className="logo"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.span 
          className="logo-icon"
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
          }}
        >
          ♠
        </motion.span>
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

      <div className="card-container">
        <AnimatePresence mode="wait">
          {mode === 'choice' && (
            <motion.div 
              key="choice"
              className="choice-panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {t('readyToPlay', language)}
              </motion.h2>
              <div className="choice-buttons">
                <motion.button 
                  className="btn btn-primary" 
                  onClick={() => setMode('create')}
                  variants={buttonVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px var(--accent-glow)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  {t('createRoom', language)}
                </motion.button>
                <motion.button 
                  className="btn btn-secondary" 
                  onClick={() => setMode('join')}
                  variants={buttonVariants}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  {t('joinRoom', language)}
                </motion.button>
              </div>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div 
              key="create"
              className="form-panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.button 
                className="back-btn" 
                onClick={resetForm}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: -4 }}
              >
                {t('back', language)}
              </motion.button>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {t('createRoomTitle', language)}
              </motion.h2>
              <motion.div 
                className="form-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label>{t('yourName', language)}</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => { setPlayerName(e.target.value); setLocalError(''); onClearError(); }}
                  placeholder={t('enterYourName', language)}
                  maxLength={20}
                  autoFocus
                />
              </motion.div>
              <motion.div 
                className="form-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label>{t('estimationType', language)}</label>
                <div className="estimation-toggle">
                  <motion.button
                    type="button"
                    className={`toggle-option ${estimationType === 'fibonacci' ? 'active' : ''}`}
                    onClick={() => setEstimationType('fibonacci')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="toggle-icon">🌰</span>
                    {t('fibonacci', language)}
                  </motion.button>
                  <motion.button
                    type="button"
                    className={`toggle-option ${estimationType === 'hours' ? 'active' : ''}`}
                    onClick={() => setEstimationType('hours')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="toggle-icon">⏱</span>
                    {t('hours', language)}
                  </motion.button>
                </div>
              </motion.div>
              <AnimatePresence>
                {displayError && (
                  <motion.p 
                    className="error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {displayError}
                  </motion.p>
                )}
              </AnimatePresence>
              <motion.button 
                className="btn btn-primary btn-full" 
                onClick={handleCreate}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px var(--accent-glow)' }}
                whileTap={{ scale: 0.98 }}
              >
                {t('create', language)}
              </motion.button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div 
              key="join"
              className="form-panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.button 
                className="back-btn" 
                onClick={resetForm}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: -4 }}
              >
                {t('back', language)}
              </motion.button>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {t('joinRoomTitle', language)}
              </motion.h2>
              <motion.div 
                className="form-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label>{t('roomCode', language)}</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => { setRoomCode(e.target.value.toUpperCase().slice(0, 6)); setLocalError(''); onClearError(); }}
                  placeholder={t('enterRoomCode', language)}
                  maxLength={6}
                  className="code-input"
                  autoFocus
                />
              </motion.div>
              <motion.div 
                className="form-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label>{t('yourName', language)}</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => { setPlayerName(e.target.value); setLocalError(''); onClearError(); }}
                  placeholder={t('enterYourName', language)}
                  maxLength={20}
                />
              </motion.div>
              <AnimatePresence>
                {displayError && (
                  <motion.p 
                    className="error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {displayError}
                  </motion.p>
                )}
              </AnimatePresence>
              <motion.button 
                className="btn btn-primary btn-full" 
                onClick={handleJoin}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px var(--accent-glow)' }}
                whileTap={{ scale: 0.98 }}
              >
                {t('join', language)}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.footer 
        className="footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p>{t('planningPoker', language)}</p>
      </motion.footer>
    </div>
  )
}
