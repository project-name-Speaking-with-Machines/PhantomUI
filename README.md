# PhantomUI 2.0 - Voice-to-Voice Web Experience

A revolutionary voice-first web application that eliminates traditional UI in favor of voice interaction and generative graphics.

## Features

- **Voice-Only Interface**: ≤20% traditional UI - only onboarding and debug overlay show text
- **WebGL Nebula Background**: Dynamic shader-based graphics that respond to user preferences
- **Modular Voice Apps**: Wordle, Weather, and extensible module system
- **Smart Intent Routing**: Local and cloud-based voice command interpretation
- **Persistent Preferences**: Remembers user settings and voice preferences

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd PhantomUI
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key for Whisper STT
   - Optionally add Cloudflare Worker URL for remote intent routing

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Grant Microphone Access**
   - Browser will prompt for microphone permission
   - Required for voice commands to work

## Voice Commands

### General Commands
- **"Play Wordle"** - Start the word guessing game
- **"Show Weather"** - Display current weather for your location
- **"Stop"** / **"Close"** - Return to idle screen

### Wordle Game
- **Individual letters**: "A", "B", "C", etc.
- **Complete words**: "GHOST", "REACT", etc.
- **"Delete"** - Remove last letter
- **"Submit"** - Guess current word
- **"Hint"** - Get a helpful hint
- **"New game"** - Start over

### Weather Module
- **"Refresh"** - Update weather data
- **"Close"** - Return to main screen

## Technical Architecture

### Core Components
- **React Shell**: Main application host with WebGL canvas
- **Voice Hooks**: STT/TTS integration with OpenAI Whisper and Web Speech API
- **Module System**: Lazy-loaded components with voice command handling
- **Intent Engine**: Local and cloud-based command routing
- **Nebula Canvas**: WebGL shader-based background graphics

### Voice Flow
```
Microphone → Whisper STT → Intent Router → Module Loader → Voice Response + Graphics
```

### File Structure
```
PhantomUI/
├── src/
│   ├── components/
│   │   └── NebulaCanvas.jsx     # WebGL shader background
│   ├── hooks/
│   │   ├── useSTT.js            # Speech-to-Text
│   │   └── useTTS.js            # Text-to-Speech
│   ├── modules/
│   │   ├── wordle/              # Word guessing game
│   │   └── weather/             # Weather display
│   ├── onboarding/
│   │   └── VoiceWizard.jsx      # Voice-driven setup
│   ├── services/
│   │   └── intentClient.js      # Command routing
│   └── App.jsx                  # Main application
├── worker/
│   └── intent-router.js         # Cloudflare Worker for intent routing
└── README.md
```

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Cloudflare Worker (Optional)
```bash
cd worker
npm install -g wrangler
wrangler deploy
```
Copy the Worker URL to `VITE_CF_INTENT_URL` in your `.env` file.

## Customization

### Adding New Modules
1. Create new folder in `src/modules/`
2. Export component with `handleVoiceCommand` method
3. Add to `MODULES` object in `App.jsx`
4. Update intent routing in `intentClient.js`

### Modifying Voice Commands
- Edit `src/services/intentClient.js` for local routing
- Edit `worker/intent-router.js` for cloud routing

### Changing Visual Theme
- Modify `src/components/NebulaCanvas.jsx` shader
- Update user preferences in onboarding

## Troubleshooting

### Voice Commands Not Working
- Ensure microphone permission is granted
- Check browser console for errors
- Verify OpenAI API key is valid
- Try using keyboard shortcuts as fallback

### WebGL Issues
- Ensure browser supports WebGL2
- Check graphics drivers are updated
- Fall back to simpler graphics if needed

### Network Issues
- Weather requires internet connection
- STT requires OpenAI API access
- Intent routing can work offline

## Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Limited Web Speech API support
- **Edge**: Full support

## Contributing

This is a hackathon project built for rapid prototyping. Future enhancements:
- Mobile PWA support
- Multiple language support
- Additional voice modules
- Advanced voice activity detection
- Real-time collaboration features

## License

MIT License - Built for innovation and learning!
