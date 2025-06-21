import { useState, useEffect } from "react";
import { useVoiceAgent } from "./hooks/useVoiceAgent";
import NebulaCanvas from "./components/NebulaCanvas";
import WordleGame from "./components/WordleGame";

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  
  const {
    isActive,
    status,
    lastTranscript,
    confidence,
    generatedUI,
    startListening,
    closeUI
  } = useVoiceAgent();

  // Auto-start voice listening after user interaction
  const handleInitialClick = () => {
    if (!hasStarted) {
      setHasStarted(true);
      startListening();
    }
  };

  // Status indicator colors
  const getStatusColor = () => {
    switch (status) {
      case 'listening': return '#4ecdc4';
      case 'processing': return '#ffd93d';
      case 'responding': return '#ff6b6b';
      default: return 'rgba(255, 255, 255, 0.3)';
    }
  };

  // Status text
  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'responding': return 'Responding...';
      default: return 'Ready to listen';
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden',
      cursor: hasStarted ? 'default' : 'pointer'
    }} onClick={handleInitialClick}>
      
      {/* Nebula Canvas Background */}
      <NebulaCanvas />
      
      {/* Minimal Voice Status Overlay */}
      {hasStarted && (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          {/* Status Indicator */}
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: getStatusColor(),
            margin: '0 auto 10px auto',
            boxShadow: `0 0 20px ${getStatusColor()}`,
            animation: status === 'listening' ? 'pulse 2s infinite' : 'none'
          }} />
          
          {/* Status Text */}
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.8rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '20px'
          }}>
            {getStatusText()}
          </div>
        </div>
      )}

      {/* Last Transcript Display */}
      {hasStarted && lastTranscript && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          textAlign: 'center',
          maxWidth: '80%',
          pointerEvents: 'none'
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            borderRadius: '25px',
            padding: '15px 25px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '1rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.4',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            "{lastTranscript}"
            {confidence > 0 && (
              <div style={{
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '5px'
              }}>
                {Math.round(confidence * 100)}% confident
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial Splash Screen */}
      {!hasStarted && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          textAlign: 'center',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            fontSize: '3rem',
            fontWeight: '300',
            marginBottom: '20px',
            background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            animation: 'glow 2s ease-in-out infinite alternate'
          }}>
            PhantomUI
          </div>
          <div style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '30px'
          }}>
            A blank browser tab that talks back
          </div>
          <div style={{
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.5)',
            animation: 'pulse 2s infinite'
          }}>
            Click anywhere to begin
          </div>
        </div>
      )}

      {/* Dynamic UI Generation */}
      {generatedUI === 'wordle' && (
        <WordleGame onClose={closeUI} />
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes glow {
            0% { filter: brightness(1); }
            100% { filter: brightness(1.2); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
