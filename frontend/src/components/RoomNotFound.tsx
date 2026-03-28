import { motion } from 'framer-motion'
import { useGameStore } from '../hooks/useGameStore'

interface RoomNotFoundProps {
  roomCode?: string
  onGoHome: () => void
}

export function RoomNotFound({ roomCode, onGoHome }: RoomNotFoundProps) {
  const { language, toggleLanguage } = useGameStore()

  return (
    <div className="room-not-found">
      <motion.button
        className="lang-toggle"
        onClick={toggleLanguage}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {language === 'en' ? 'ES' : 'EN'}
      </motion.button>

      <motion.div
        className="not-found-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="not-found-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6"/>
            <path d="M9 9l6 6"/>
          </svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {language === 'en' ? 'Room Not Found' : 'Sala no encontrada'}
        </motion.h2>

        <motion.p
          className="not-found-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {roomCode 
            ? (language === 'en' 
                ? `Room "${roomCode}" doesn't exist or has expired.`
                : `La sala "${roomCode}" no existe o ha expirado.`)
            : (language === 'en'
                ? 'The room you are looking for is not available.'
                : 'La sala que buscas no está disponible.')
          }
        </motion.p>

        <motion.button
          className="btn btn-primary btn-large"
          onClick={onGoHome}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02, boxShadow: '0 8px 30px var(--accent-glow)' }}
          whileTap={{ scale: 0.98 }}
        >
          {language === 'en' ? 'Go to Home' : 'Ir al inicio'}
        </motion.button>
      </motion.div>
    </div>
  )
}
