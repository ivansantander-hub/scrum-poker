import { motion } from 'framer-motion'
import { useGameStore } from '../hooks/useGameStore'

interface KickedOutProps {
  onGoHome: () => void
}

export function KickedOut({ onGoHome }: KickedOutProps) {
  const { language } = useGameStore()

  return (
    <div className="room-not-found">
      <div className="not-found-content">
        <motion.div 
          className="not-found-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M16 8L8 16M8 8l8 8"/>
          </svg>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {language === 'en' ? 'Removed from Room' : 'Expulsado de la Sala'}
        </motion.h2>
        
        <motion.p 
          className="not-found-message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {language === 'en' 
            ? 'You have been removed from the room by the host. You can create a new room or join another one.' 
            : 'Has sido expulsado de la sala por el anfitrión. Puedes crear una nueva sala o unirte a otra.'}
        </motion.p>
        
        <motion.button 
          className="btn btn-primary"
          onClick={onGoHome}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {language === 'en' ? 'Go Home' : 'Ir al Inicio'}
        </motion.button>
      </div>
    </div>
  )
}
