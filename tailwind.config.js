/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4A90E2',
        accent: '#F5A623',
        background: '#F9FAFB',
        text: '#333333',
      },
      keyframes: {
        'flash-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'flash-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        'flash-pop': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
        },
        fall: {
          '0%': { transform: 'translate3d(0,-120%,0)' },
          '100%': { transform: 'translate3d(0,240px,0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(var(--drift, 16px))' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.88', transform: 'scale(1.04)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        'hp-shrink': {
          '0%': { transform: 'scaleX(1)' },
          '100%': { transform: 'scaleX(0.85)' },
        },
        'attack-flash': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '0.65' },
        },
        'timer-pulse': {
          '0%, 100%': { transform: 'scale(1)', color: '#dc2626' },
          '50%': { transform: 'scale(1.1)', color: '#b91c1c' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        highlight: {
          '0%, 100%': { backgroundColor: '#dbeafe' },
          '50%': { backgroundColor: '#fef08a' },
        },
        'pulse-strong': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'flash-in': 'flash-in 180ms ease-out both',
        'flash-out': 'flash-out 220ms ease-in 280ms both',
        'flash-pop': 'flash-pop 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'flash-cycle': 'flash-in 180ms ease-out both, flash-pop 180ms ease-out 180ms both, flash-out 220ms ease-in 360ms both',
        fall: 'fall var(--fall-duration, 2.8s) linear var(--fall-delay, 0ms) infinite',
        drift: 'drift 1.8s ease-in-out infinite',
        bounce: 'bounce 620ms ease-in-out infinite',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
        shake: 'shake 420ms ease-in-out',
        'hp-shrink': 'hp-shrink 850ms ease-out both',
        'attack-flash': 'attack-flash 520ms ease-in-out infinite',
        'timer-pulse': 'timer-pulse 700ms ease-in-out infinite',
        'fade-in': 'fade-in 360ms ease-out both',
        highlight: 'highlight 1.2s ease-in-out infinite',
        'pulse-strong': 'pulse-strong 550ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slide-up 420ms ease-out both',
        skeleton: 'skeleton 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
