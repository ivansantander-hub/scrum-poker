import { useSocket } from '../hooks/useSocket'
import { useGameStore } from '../hooks/useGameStore'
import { t } from '../i18n'
import { motion } from 'framer-motion'

export function ConnectionStatus() {
  const { isConnected } = useSocket()
  const { language } = useGameStore()

  if (!import.meta.env.DEV) return null

  return (
    <motion.div 
      className="connection-status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
      <span className={`status-text ${isConnected ? 'online' : 'offline'}`}>
        {isConnected ? t('online', language) : t('offline', language)}
      </span>
    </motion.div>
  )
}
