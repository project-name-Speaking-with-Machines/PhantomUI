# PhantomUI 2.0 - Voice-Powered Productivity Assistant

A sophisticated voice-first web application featuring an intelligent Pomodoro timer and dynamic visual feedback system.

## Core Features

- **Advanced Voice Interface**
  - Dynamic visual feedback orb (80px)
  - State-based animations (Listening, Processing, Responding, Idle)
  - Natural language command processing
  - Status indicator with enhanced typography and glow effects

- **Intelligent Pomodoro Timer**
  - Multiple session types (Focus, Short Break, Long Break)
  - Statistics tracking and data persistence
  - Settings panel with customization options
  - Voice commands and keyboard shortcuts
  - Visual progress indicators
  - Sound notifications

- **Modular Architecture**
  - Weather module with real-time updates
  - Recipe module with structured data
  - Wordle game integration
  - Flight information module
  - Extensible module system

## Quick Start

1. **Installation**
   ```bash
   git clone <your-repo>
   cd PhantomUI
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Add required API keys
   - Configure voice settings

3. **Development**
   ```bash
   npm run dev
   ```

## Voice Commands

### Global Commands
- "Hey Phantom" - Wake phrase
- "Start focus session" - Begin Pomodoro timer
- "How much time is left?" - Check timer status
- "Take a break" - Start break timer
- "Stop timer" - End current session

### Pomodoro Commands
- "Start/pause/resume timer"
- "Skip current session"
- "Show statistics"
- "Open settings"
- "Set focus time to X minutes"

### Module-Specific Commands
- Weather: "Show weather", "Update forecast"
- Recipe: "Find recipes", "Show ingredients"
- Wordle: "Start game", "Make guess"
- Flight: "Check flight status"

## Technical Architecture

### Core Components
- **React + Vite**: Modern development environment
- **Voice Processing**: Advanced STT/TTS integration
- **Dynamic UI**: Responsive design scaled to 120%
- **State Management**: Persistent data storage
- **Module System**: Lazy-loaded components

### Visual Feedback States
```
Listening  → Green, bouncy, 80px
Processing → Yellow, slow pulse
Responding → Blue, rhythmic
Idle      → Gray, subtle pulse
```

### File Structure
```
PhantomUI/
├── src/
│   ├── components/
│   │   ├── NebulaCanvas.jsx    # Dynamic background
│   │   └── WordleGame.jsx      # Game module
│   ├── hooks/
│   │   └── useVoiceAgent.js    # Voice processing
│   ├── modules/
│   │   ├── pomodoro/           # Timer module
│   │   ├── weather/            # Weather module
│   │   ├── recipe/             # Recipe module
│   │   ├── flight/             # Flight module
│   │   └── wordle/             # Word game
│   └── App.jsx                 # Main application
└── worker/
    └── intent-router.js        # Command routing
```

## Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited voice features

## Contributing
Open for contributions in:
- Additional productivity modules
- Enhanced voice recognition
- Visual feedback improvements
- Performance optimizations

## License
MIT License - Built for productivity and innovation
