// Sound utility for Scrum Poker
// Uses Web Audio API for better browser compatibility

class SoundManager {
  private audioContext: AudioContext | null = null
  private enabled = true

  constructor() {
    // Check user preference
    this.enabled = localStorage.getItem('scrum-poker-sound-enabled') !== 'false'
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled) return

    try {
      const ctx = this.getAudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch (e) {
      console.warn('Sound playback failed:', e)
    }
  }

  playVote() {
    // Pleasant "ding" sound - C5 (523.25 Hz)
    this.playTone(523.25, 0.15, 'sine')
    setTimeout(() => this.playTone(659.25, 0.1, 'sine'), 50) // E5
  }

  playReveal() {
    // Exciting reveal sound - ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'triangle'), i * 80)
    })
  }

  playKick() {
    // Low warning sound
    this.playTone(200, 0.3, 'sawtooth')
    setTimeout(() => this.playTone(150, 0.4, 'sawtooth'), 150)
  }

  playJoin() {
    // Welcome sound - major third
    this.playTone(440, 0.1, 'sine') // A4
    setTimeout(() => this.playTone(554.37, 0.15, 'sine'), 50) // C#5
  }

  playLeave() {
    // Departure sound - descending
    this.playTone(392, 0.1, 'sine') // G4
    setTimeout(() => this.playTone(329.63, 0.15, 'sine'), 50) // E4
  }

  playReset() {
    // Reset sound - quick double beep
    this.playTone(880, 0.08, 'sine') // A5
    setTimeout(() => this.playTone(880, 0.08, 'sine'), 120)
  }

  toggle() {
    this.enabled = !this.enabled
    localStorage.setItem('scrum-poker-sound-enabled', String(this.enabled))
    return this.enabled
  }

  isEnabled() {
    return this.enabled
  }

  enable() {
    this.enabled = true
    localStorage.setItem('scrum-poker-sound-enabled', 'true')
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume()
    }
  }
}

export const soundManager = new SoundManager()
