import { useState, useEffect } from 'react';
import NebulaCanvas from './components/NebulaCanvas';
import WordleGame from './components/WordleGame';
import useVoiceAgent from './hooks/useVoiceAgent';
import { MODULE_REGISTRY } from './modules/moduleRegistry';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const {
    isActive,
    status,
    lastTranscript,
    confidence,
    generatedUI,
    isSpeaking,
    startListening,
    stopListening,
    closeUI
  } = useVoiceAgent();

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

      {/* Enhanced Pulsating Orb - only visible when no module is active */}
      {!currentModule && (
        <div className="pulsating-orb">
          <div className="orb-inner"></div>
          <div className="orb-outer"></div>
          <div className="orb-particles"></div>
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
