import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authApi, ApiError } from '../lib/api'
import { useAuthStore } from '../hooks/useAuthStore'
import { useGameStore } from '../hooks/useGameStore'
import { t } from '../i18n'

type AuthMode = 'login' | 'register'

const panelVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
  exit: { opacity: 0, x: -30 },
}

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { setAuth } = useAuthStore()
  const { language, toggleLanguage } = useGameStore()

  const validate = (): boolean => {
    if (!email.trim()) {
      setError(t('emailRequired', language))
      return false
    }
    if (password.length < 6) {
      setError(t('passwordMinLength', language))
      return false
    }
    if (mode === 'register' && !name.trim()) {
      setError(t('nameRequired', language))
      return false
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        const result = (await authApi.login(email.trim(), password)) as {
          accessToken: string
          user: { id: string; email: string; name: string; role: string }
        }
        setAuth(result.user, result.accessToken)
      } else {
        const result = (await authApi.register(email.trim(), password, name.trim())) as {
          accessToken: string
          user: { id: string; email: string; name: string; role: string }
        }
        setAuth(result.user, result.accessToken)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(mode === 'login' ? t('loginError', language) : t('registerError', language))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError('')
    setPassword('')
  }

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
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
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

      <div className="card-container auth-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            className="form-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {mode === 'login' ? t('loginTitle', language) : t('registerTitle', language)}
            </motion.h2>
            <p className="subtitle">{t('planningPoker', language)}</p>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <motion.div
                  className="form-group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <label>{t('name', language)}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError('') }}
                    placeholder={t('name', language)}
                    maxLength={50}
                    autoComplete="name"
                  />
                </motion.div>
              )}

              <motion.div
                className="form-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: mode === 'register' ? 0.1 : 0.05 }}
              >
                <label>{t('email', language)}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder={t('email', language)}
                  autoComplete="email"
                  autoFocus={mode === 'login'}
                />
              </motion.div>

              <motion.div
                className="form-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: mode === 'register' ? 0.15 : 0.1 }}
              >
                <label>{t('password', language)}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder={t('password', language)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    className="error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={isSubmitting}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={isSubmitting ? undefined : { scale: 1.02, boxShadow: '0 8px 30px var(--accent-glow)' }}
                whileTap={isSubmitting ? undefined : { scale: 0.98 }}
              >
                {isSubmitting
                  ? '...'
                  : mode === 'login'
                    ? t('loginButton', language)
                    : t('registerButton', language)}
              </motion.button>
            </form>

            <motion.button
              type="button"
              className="auth-switch-link"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {mode === 'login' ? t('switchToRegister', language) : t('switchToLogin', language)}
            </motion.button>
          </motion.div>
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
