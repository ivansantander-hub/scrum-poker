import { motion, AnimatePresence } from 'framer-motion'

interface AvatarPreviewModalProps {
  avatar: string | null
  onClose: () => void
}

export function AvatarPreviewModal({ avatar, onClose }: AvatarPreviewModalProps) {
  if (!avatar) return null
  
  return (
    <AnimatePresence>
      <motion.div
        className="avatar-preview-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="avatar-preview-modal"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={`/characters/${avatar}`}
            alt="Avatar"
            className="avatar-preview-img"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
