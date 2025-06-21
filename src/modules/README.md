# PhantomUI Modules

This directory contains modular UI components that can be activated by voice commands.

## Module Structure

Each module should be in its own directory with an `index.jsx` file that exports a React component.

### Standard Module Interface

```jsx
const YourModule = ({ onClose }) => {
  // Module implementation
  return (
    <div className="module-container">
      {/* Your module UI */}
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default YourModule;
```

### Module Registry

Add your module to `moduleRegistry.js`:

```javascript
export const MODULE_REGISTRY = {
  yourModule: {
    component: YourModule,
    aliases: ['your module', 'module name', 'alternative names'],
    keywords: ['keyword1', 'keyword2', 'trigger words'],
    description: 'Brief description of what the module does'
  }
};
```

## Available Modules

### 1. Wordle Game
- **Voice Commands:** "play wordle", "word game", "start game"
- **Features:** Full Wordle implementation with keyboard input
- **Location:** `../components/WordleGame.jsx`

### 2. Weather Module
- **Voice Commands:** "weather", "temperature", "forecast"
- **Features:** Current weather information using Open-Meteo API
- **Location:** `./weather/index.jsx`

## Adding New Modules

1. Create a new directory: `src/modules/[module-name]/`
2. Create `index.jsx` with your module component
3. Add the module to `moduleRegistry.js`
4. Test with voice commands

## Voice Command Processing

The system uses OpenAI's LLM to detect UI generation intents and matches them against the module registry. Commands are processed in this order:

1. **Direct Registry Match:** Checks aliases and keywords
2. **LLM Intent Detection:** Uses AI to understand the request
3. **Fallback:** Provides list of available modules

## Styling Guidelines

- Use glassmorphic design patterns
- Maintain consistent color schemes
- Include smooth animations and transitions
- Ensure mobile responsiveness
- Add proper close buttons and escape handling
