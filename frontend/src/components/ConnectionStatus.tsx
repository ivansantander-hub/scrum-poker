import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';

export function ConnectionStatus() {
  const { isConnected, serverStatus } = useSocket();

  return (
    <motion.div
      className="connection-status"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="status-indicator"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      >
        <motion.span
          className={`status-dot ${isConnected ? 'online' : 'offline'}`}
          animate={{
            scale: isConnected ? [1, 1.2, 1] : 1,
            opacity: isConnected ? 1 : 0.5,
          }}
          transition={{
            scale: { duration: 2, repeat: Infinity, repeatType: 'reverse' },
            opacity: { duration: 0.3 },
          }}
        />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.span
          key={isConnected ? 'online' : 'offline'}
          className={`status-text ${isConnected ? 'online' : 'offline'}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
        >
          {isConnected ? 'Online' : 'Offline'}
        </motion.span>
      </AnimatePresence>
      {isConnected && serverStatus.clients > 0 && (
        <motion.span
          className="clients-count"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {serverStatus.clients} client{serverStatus.clients !== 1 ? 's' : ''}
        </motion.span>
      )}
    </motion.div>
  );
}
