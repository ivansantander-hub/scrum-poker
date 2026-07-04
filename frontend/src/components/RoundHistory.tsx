import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../hooks/useGameStore'
import { useSocket } from '../hooks/useSocket'
import type { RoundHistory } from '../hooks/useGameStore'
import { t } from '../i18n'

interface RoundHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export function RoundHistoryPanel({ isOpen, onClose }: RoundHistoryProps) {
  const { language } = useGameStore()
  const { roundHistory, exportToCSV } = useSocket()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString(language === 'en' ? 'en-US' : 'es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="history-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="history-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-header">
              <h3>{language === 'en' ? 'Round History' : 'Historial de Rondas'}</h3>
              <div className="history-actions">
                {roundHistory.length > 0 && (
                  <button 
                    className="btn btn-small"
                    onClick={exportToCSV}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>{t('exportCSV', language)}</span>
                  </button>
                )}
                <button className="history-close" onClick={onClose}>×</button>
              </div>
            </div>

            <div className="history-content">
              {roundHistory.length === 0 ? (
                <div className="history-empty">
                  <p>{language === 'en' ? 'No rounds completed yet' : 'No hay rondas completadas'}</p>
                </div>
              ) : (
                <div className="history-list">
                  {roundHistory.map((round: RoundHistory) => (
                    <motion.div
                      key={round.id}
                      className="history-round"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="round-header">
                        <span className="round-number">#{round.roundNumber}</span>
                        <span className="round-time">{formatDate(round.createdAt)}</span>
                        <span className="round-average">
                          {language === 'en' ? 'Avg' : 'Prom'}: <strong>{round.average}</strong>
                          {round.stdDev && round.stdDev !== '-' && (
                            <span className="round-stddev"> ±{round.stdDev}</span>
                          )}
                        </span>
                      </div>
                      {(round.title || round.link) && (
                        <div className="round-meta">
                          {round.title && <span className="round-meta-title">{round.title}</span>}
                          {round.link && (
                            <a href={round.link} target="_blank" rel="noopener noreferrer" className="round-meta-link">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                              </svg>
                              {round.link}
                            </a>
                          )}
                        </div>
                      )}
                      <div className="round-votes">
                        {round.votes.map((v, idx) => (
                          <span key={idx} className="round-vote-item">
                            {v.playerName}: <strong>{v.vote}</strong>
                          </span>
                        ))}
                      </div>
                      {round.finalDecision && (
                        <div className="round-decision">
                          <span className="decision-label">{language === 'en' ? 'Final' : 'Decisión'}:</span>
                          <strong>{round.finalDecision}</strong>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
