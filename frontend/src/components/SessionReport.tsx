import { motion } from 'framer-motion'
import { useGameStore } from '../hooks/useGameStore'
import { useSocket } from '../hooks/useSocket'

interface SessionReportProps {
  showSessionReport: boolean
  onClose: () => void
}

export function SessionReport({ showSessionReport, onClose }: SessionReportProps) {
  const { language, currentRoom } = useGameStore()
  const { sessionStats } = useSocket()

  if (!showSessionReport || !sessionStats) return null

  return (
    <motion.div
      className="report-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: showSessionReport ? 1 : 0 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="report-panel"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: showSessionReport ? 1 : 0.9, opacity: showSessionReport ? 1 : 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-header">
          <h2>{language === 'en' ? 'Session Report' : 'Informe de Sesión'}</h2>
          <span className="report-room">{currentRoom?.code || ''}</span>
        </div>

        <div className="report-summary">
          <div className="report-stat">
            <span className="report-stat-value">{sessionStats.totalRounds}</span>
            <span className="report-stat-label">{language === 'en' ? 'Rounds' : 'Rondas'}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-value">{sessionStats.overallAverage}</span>
            <span className="report-stat-label">{language === 'en' ? 'Avg Points' : 'Prom Puntos'}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-value">{sessionStats.playerStats?.length || 0}</span>
            <span className="report-stat-label">{language === 'en' ? 'Players' : 'Jugadores'}</span>
          </div>
        </div>

        {sessionStats.playerStats?.length > 0 && (
          <div className="report-section">
            <h3>{language === 'en' ? 'Player Statistics' : 'Estadísticas por Jugador'}</h3>
            <div className="report-players">
              {sessionStats.playerStats.map((player: any) => (
                <motion.div
                  key={player.playerId}
                  className="report-player-card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="report-player-header">
                    <span className="report-player-name">{player.playerName}</span>
                    <span className="report-player-avg">
                      {language === 'en' ? 'Avg' : 'Prom'}: <strong>{player.average}</strong>
                    </span>
                  </div>
                  <div className="report-player-votes">
                    {player.votes.map((vote: string, idx: number) => (
                      <span key={idx} className="report-vote-chip">{vote}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {sessionStats.rounds?.length > 0 && (
          <div className="report-section">
            <h3>{language === 'en' ? 'Round History' : 'Historial de Rondas'}</h3>
            <div className="report-rounds">
              {sessionStats.rounds.map((round: any) => (
                <div key={round.id} className="report-round-row">
                  <span className="report-round-num">#{round.roundNumber}</span>
                  <span className="report-round-avg">
                    {round.average}
                    {round.stdDev && round.stdDev !== '-' && (
                      <span className="round-stddev"> ±{round.stdDev}</span>
                    )}
                  </span>
                  <span className="report-round-votes">{round.votes.length} {language === 'en' ? 'votes' : 'votos'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="report-actions">
          <motion.button
            className="btn btn-primary"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {language === 'en' ? 'Close' : 'Cerrar'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}