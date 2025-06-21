import { useState, useEffect } from 'react';
import NebulaCanvas from './components/NebulaCanvas';
import WordleGame from './components/WordleGame';
import useVoiceAgent from './hooks/useVoiceAgent';
import { MODULE_REGISTRY, findModuleByCommand, isIdentityQuestion } from './modules/moduleRegistry';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [identityResponse, setIdentityResponse] = useState(null);
  const [showDebug, setShowDebug] = useState(false); // Debug mode state
  
  const {
    isActive,
    status,
    lastTranscript,
    confidence,
    generatedUI,
    isSpeaking,
    startListening,
    stopListening,
    closeUI,
    speakMessage
  } = useVoiceAgent();

  // Debug function to manually set a module
  const debugSetModule = (moduleId) => {
    closeUI(); // Close any existing module
    setTimeout(() => {
      // Use the module registry to find the module
      const ModuleComponent = MODULE_REGISTRY[moduleId]?.component;
      if (ModuleComponent) {
        console.log(`Debug: Setting module to ${moduleId}`);
        // We need to use the internal implementation to set the UI
        window.dispatchEvent(new CustomEvent('set-module', {
          detail: { moduleId }
        }));
      } else {
        console.error(`Debug: Module ${moduleId} not found`);
      }
    }, 100);
  };

  // Listen for the debug event to set modules
  useEffect(() => {
    const handleSetModule = (event) => {
      if (event.detail && event.detail.moduleId) {
        // This is a hack to directly set the generatedUI state in useVoiceAgent
        // In a real app, you would use a proper state management solution
        document.querySelector('body').setAttribute('data-module', event.detail.moduleId);
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    window.addEventListener('set-module', handleSetModule);
    return () => window.removeEventListener('set-module', handleSetModule);
  }, []);

  // Toggle debug mode with Shift+D
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStart = async () => {
    setHasStarted(true);
    await startListening();
  };

  const handleStop = () => {
    // Stop listening and clear UI
    stopListening();
    closeUI();
    // Return to starting screen
    setHasStarted(false);
  };

  // Process voice commands for identity questions
  useEffect(() => {
    if (!lastTranscript || generatedUI) return;
    
    // Check if the command is asking about Phantom's identity
    if (isIdentityQuestion(lastTranscript)) {
      const responses = [
        "I am Phantom, a voice-first interface designed to help you with minimal visual distractions.",
        "I'm Phantom, your voice assistant. I can help with timers, recipes, games, weather, and tracking flights.",
        "I'm your Phantom interface. I respond primarily to voice commands while keeping visual elements to a minimum."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setIdentityResponse(randomResponse);
      
      // Speak the response
      speakMessage(randomResponse);
      
      // Clear the identity response after display time
      setTimeout(() => {
        setIdentityResponse(null);
      }, 5000);
    }
  }, [lastTranscript, generatedUI, speakMessage]);

  // Get the current module component
  const getCurrentModule = () => {
    if (!generatedUI) return null;
    
    const moduleConfig = MODULE_REGISTRY[generatedUI];
    if (moduleConfig) {
      const ModuleComponent = moduleConfig.component;
      return <ModuleComponent onClose={closeUI} />;
    }
    
    // Fallback for backward compatibility
    if (generatedUI === 'wordle') {
      return <WordleGame onClose={closeUI} />;
    }
    
    return null;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return '#4ade80'; // green
      case 'processing': return '#f59e0b'; // amber
      case 'responding': return '#3b82f6'; // blue
      default: return '#6b7280'; // gray
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'responding': return 'Speaking...';
      default: return 'Ready';
    }
  };

  const getOrbStyles = () => {
    const baseStyles = {
      inner: {
        background: '',
        boxShadow: '',
        animation: '',
        transform: 'translate(-50%, -50%)',
        width: '60px',
        height: '60px'
      },
      outer: {
        borderColor: '',
        animation: '',
        transform: 'translate(-50%, -50%)',
        width: '120px',
        height: '120px'
      }
    };

    switch (status) {
      case 'listening':
        baseStyles.inner.background = 'radial-gradient(circle, rgba(74, 222, 128, 0.8), rgba(34, 197, 94, 0.4))';
        baseStyles.inner.boxShadow = '0 0 30px rgba(74, 222, 128, 0.7), 0 0 60px rgba(74, 222, 128, 0.4)';
        baseStyles.inner.animation = 'listeningPulse 1.5s ease-in-out infinite';
        baseStyles.inner.width = '80px';
        baseStyles.inner.height = '80px';
        baseStyles.outer.borderColor = 'rgba(74, 222, 128, 0.4)';
        baseStyles.outer.animation = 'fastRotate 8s linear infinite';
        baseStyles.outer.width = '140px';
        baseStyles.outer.height = '140px';
        break;
      
      case 'processing':
        baseStyles.inner.background = 'radial-gradient(circle, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.4))';
        baseStyles.inner.boxShadow = '0 0 25px rgba(245, 158, 11, 0.6)';
        baseStyles.inner.animation = 'processingPulse 3s ease-in-out infinite';
        baseStyles.inner.width = '70px';
        baseStyles.inner.height = '70px';
        baseStyles.outer.borderColor = 'rgba(245, 158, 11, 0.3)';
        baseStyles.outer.animation = 'slowRotate 15s linear infinite';
        break;
      
      case 'responding':
        baseStyles.inner.background = 'radial-gradient(circle, rgba(59, 130, 246, 0.8), rgba(30, 64, 175, 0.4))';
        baseStyles.inner.boxShadow = '0 0 35px rgba(59, 130, 246, 0.7), 0 0 70px rgba(59, 130, 246, 0.3)';
        baseStyles.inner.animation = 'respondingPulse 2s ease-in-out infinite';
        baseStyles.inner.width = '75px';
        baseStyles.inner.height = '75px';
        baseStyles.outer.borderColor = 'rgba(59, 130, 246, 0.4)';
        baseStyles.outer.animation = 'mediumRotate 10s linear infinite';
        baseStyles.outer.width = '130px';
        baseStyles.outer.height = '130px';
        break;
      
      default:
        baseStyles.inner.background = 'radial-gradient(circle, rgba(107, 114, 128, 0.6), rgba(75, 85, 99, 0.3))';
        baseStyles.inner.boxShadow = '0 0 20px rgba(107, 114, 128, 0.4)';
        baseStyles.inner.animation = 'idlePulse 4s ease-in-out infinite';
        baseStyles.outer.borderColor = 'rgba(107, 114, 128, 0.2)';
        baseStyles.outer.animation = 'simpleRotate 12s linear infinite';
        break;
    }

    return baseStyles;
  };

  const simulateVoiceCommand = (command) => {
    if (!command) return;
    
    console.log(`Simulating voice command: ${command}`);
    
    // Dispatch a synthetic voice command event
    window.dispatchEvent(new CustomEvent('voice-command', {
      detail: { transcript: command }
    }));
  };

  if (!hasStarted) {
    return (
      <div className="app-container">
        <NebulaCanvas />
        <div className="splash-screen">
          <div className="landing-content">
            <h1 className="landing-logo">PhantomUI</h1>
            <p className="landing-tagline">Voice-driven interface, zero visual clutter</p>
            
            <div className="orbit-button-container">
              <div className="orbit orbit-1"></div>
              <div className="orbit orbit-2"></div>
              <button 
                className="orbit-button"
                onClick={handleStart}
              >
                Begin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentModule = getCurrentModule();

  return (
    <div className="app-container">
      <NebulaCanvas />
      
      {/* Centered Title and Status */}
      <div className="centered-header">
        <h1 className="main-title">PhantomUI</h1>
        <div className="status-indicator">
          <div 
            className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>
      
      {/* Stop Button */}
      <button 
        className="stop-button"
        onClick={handleStop}
        title="Stop listening and return to start"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
        </svg>
      </button>

      {/* Debug Panel - Only shown when debug mode is active */}
      {showDebug && (
        <div className="debug-panel">
          <h3>Debug Controls</h3>
          <div className="debug-buttons">
            <button onClick={() => debugSetModule('pomodoro')}>Pomodoro</button>
            <button onClick={() => debugSetModule('recipe')}>Recipe</button>
            <button onClick={() => debugSetModule('flight')}>Flight</button>
            <button onClick={() => debugSetModule('wordle')}>Wordle</button>
            <button onClick={() => debugSetModule('weather')}>Weather</button>
            <button onClick={closeUI}>Close Module</button>
          </div>
          
          <div className="voice-test">
            <h4>Test Voice Commands</h4>
            <div className="voice-test-buttons">
              <button onClick={() => simulateVoiceCommand("set a timer for 25 minutes")}>
                "Set timer for 25 minutes"
              </button>
              <button onClick={() => simulateVoiceCommand("show me a recipe for pasta")}>
                "Recipe for pasta"
              </button>
              <button onClick={() => simulateVoiceCommand("track flight AA123")}>
                "Track flight AA123"
              </button>
              <button onClick={() => simulateVoiceCommand("let's play wordle")}>
                "Play Wordle"
              </button>
              <button onClick={() => simulateVoiceCommand("what's the weather in New York")}>
                "Weather in New York"
              </button>
            </div>
          </div>
          
          <div className="debug-info">
            <p>Current Module: {generatedUI || 'None'}</p>
            <p>Status: {status}</p>
            <p>Last Transcript: {lastTranscript || 'None'}</p>
          </div>
        </div>
      )}

      {/* Enhanced Pulsating Orb - only visible when no module is active */}
      {!currentModule && (
        <div className="pulsating-orb">
          <div 
            className="orb-inner" 
            style={getOrbStyles().inner}
          ></div>
          <div 
            className="orb-outer" 
            style={getOrbStyles().outer}
          ></div>
          <div className="orb-particles"></div>
        </div>
      )}

      {/* Identity Response Display */}
      {identityResponse && !currentModule && (
        <div className="identity-response">
          <p>{identityResponse}</p>
        </div>
      )}

      {/* Available modules help display - only shown when triggered */}
      {lastTranscript && lastTranscript.toLowerCase().includes('help') && !currentModule && !identityResponse && (
        <div className="modules-help">
          <h3>Available Commands:</h3>
          <ul>
            <li>"Set a pomodoro timer for X minutes"</li>
            <li>"Show me a recipe for [dish]"</li>
            <li>"Let's play wordle"</li>
            <li>"Track flight [airline][number]"</li>
            <li>"What's the weather in [location]"</li>
            <li>"Who are you?"</li>
          </ul>
        </div>
      )}

      {/* Last Transcript Display */}
      {lastTranscript && (
        <div className="transcript-display">
          <div className="transcript-content">
            <span className="transcript-text">"{lastTranscript}"</span>
            {confidence > 0 && (
              <span className="confidence-score">
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Module Rendering */}
      {currentModule}
    </div>
  );
}

export default App;
