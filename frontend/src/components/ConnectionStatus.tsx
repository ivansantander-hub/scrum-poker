import { useGameStore } from '../hooks/useGameStore'
import { t } from '../i18n'
import { motion } from 'framer-motion'

export function ConnectionStatus() {
  const { isConnected, language } = useGameStore()

  if (isConnected) return null

  return (
    <motion.div 
      className="connection-status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      role="status"
      aria-live="polite"
    >
      <span className="status-dot offline" />
      <span className="status-text offline">
        {t('offline', language)}
      </span>
    </motion.div>
  )
}
