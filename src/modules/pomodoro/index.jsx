import { useState, useEffect, useRef } from 'react';

const PomodoroTimer = ({ onClose }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [timerType, setTimerType] = useState('focus'); // 'focus' or 'break'
  
  // Reference to store original minutes for reset functionality
  const originalMinutes = useRef(25);
  
  // Voice command handling
  useEffect(() => {
    const handleVoiceCommand = (event) => {
      if (!event.detail || !event.detail.transcript) return;
      
      const command = event.detail.transcript.toLowerCase();
      
      if (command.includes('start') || command.includes('resume') || command.includes('begin')) {
        setIsActive(true);
        setIsPaused(false);
      } else if (command.includes('pause') || command.includes('stop')) {
        setIsPaused(true);
      } else if (command.includes('reset')) {
        resetTimer();
      } else if (command.includes('take a break') || command.includes('break time')) {
        startBreak();
      } else if (command.includes('focus') || command.includes('work')) {
        startFocus();
      } else if (command.includes('set') || command.includes('minute')) {
        // Extract number from command like "set timer for 15 minutes"
        const numberMatch = command.match(/\d+/);
        if (numberMatch) {
          const newMinutes = parseInt(numberMatch[0]);
          if (newMinutes > 0 && newMinutes <= 60) {
            setTimeInput(newMinutes.toString());
            handleTimeSubmit(newMinutes);
          }
        }
      } else if (command.includes('close') || command.includes('exit')) {
        onClose();
      }
    };

    window.addEventListener('voice-command', handleVoiceCommand);
    return () => window.removeEventListener('voice-command', handleVoiceCommand);
  }, [onClose]);

  // Timer countdown logic
  useEffect(() => {
    let interval = null;
    
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(interval);
            setIsActive(false);
            // Timer completed - play sound and show notification
            const audio = new Audio('/sounds/timer-done.mp3');
            audio.play().catch(err => console.log('Audio play error:', err));
            
            // Speak timer completion
            const message = timerType === 'focus' 
              ? "Focus time complete. Take a break!"
              : "Break time complete. Ready to focus again?";
            
            // Dispatch synthetic event for voice response
            window.dispatchEvent(new CustomEvent('speak-message', {
              detail: { message }
            }));
            
            return;
          }
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    
    return () => clearInterval(interval);
  }, [isActive, isPaused, minutes, seconds, timerType]);

  const startTimer = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    setIsPaused(true);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setMinutes(originalMinutes.current);
    setSeconds(0);
  };
  
  const startFocus = () => {
    setTimerType('focus');
    setIsActive(false);
    setIsPaused(false);
    setMinutes(25);
    setSeconds(0);
    originalMinutes.current = 25;
  };
  
  const startBreak = () => {
    setTimerType('break');
    setIsActive(false);
    setIsPaused(false);
    setMinutes(5);
    setSeconds(0);
    originalMinutes.current = 5;
  };
  
  const handleTimeSubmit = (mins) => {
    const newMinutes = Number(mins);
    if (newMinutes > 0 && newMinutes <= 60) {
      setMinutes(newMinutes);
      setSeconds(0);
      originalMinutes.current = newMinutes;
      setTimeInput('');
    }
  };

  // Format time display
  const formatTime = () => {
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  return (
    <div className="module-overlay">
      <div className="pomodoro-container">
        <button className="close-button" onClick={onClose}>✕</button>
        
        <div className="pomodoro-header">
          <h2>
            {timerType === 'focus' ? 'Focus Timer' : 'Break Timer'}
          </h2>
        </div>
        
        <div className="timer-display">
          <div className="time">{formatTime()}</div>
        </div>
        
        <div className="timer-progress">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${((originalMinutes.current * 60 - (minutes * 60 + seconds)) / (originalMinutes.current * 60)) * 100}%`,
              background: timerType === 'focus' 
                ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' 
                : 'linear-gradient(90deg, #10b981, #3b82f6)'
            }}
          ></div>
        </div>
        
        <div className="voice-commands">
          <p>Voice commands:</p>
          <ul>
            <li>"Start timer" - Begin countdown</li>
            <li>"Pause timer" - Pause countdown</li>
            <li>"Reset timer" - Reset to initial time</li>
            <li>"Set timer for X minutes" - Change duration</li>
            <li>"Take a break" - Switch to break timer</li>
          </ul>
        </div>
        
        {/* Minimal button controls as backup */}
        <div className="timer-controls">
          <div className="timer-type-controls">
            <button 
              className={`timer-type-btn ${timerType === 'focus' ? 'active' : ''}`}
              onClick={startFocus}
            >
              Focus
            </button>
            <button 
              className={`timer-type-btn ${timerType === 'break' ? 'active' : ''}`}
              onClick={startBreak}
            >
              Break
            </button>
          </div>
          
          <div className="timer-action-controls">
            {!isActive || isPaused ? (
              <button className="control-btn start" onClick={startTimer}>
                {isPaused ? 'Resume' : 'Start'}
              </button>
            ) : (
              <button className="control-btn pause" onClick={pauseTimer}>
                Pause
              </button>
            )}
            <button className="control-btn reset" onClick={resetTimer}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer; 