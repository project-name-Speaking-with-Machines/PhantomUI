import { useState, useEffect, useRef, useCallback } from 'react';

const PomodoroTimer = ({ onClose }) => {
  // Timer states
  const [timeLeft, setTimeLeft] = useState(25 * 60); // in seconds
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSession, setCurrentSession] = useState('focus'); // 'focus', 'shortBreak', 'longBreak'
  const [sessionCount, setSessionCount] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Settings
  const [settings, setSettings] = useState({
    focusTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
    playTickingSound: false,
    notificationSound: true,
    volume: 0.7
  });

  // Statistics
  const [stats, setStats] = useState({
    todaysSessions: 0,
    totalSessions: 0,
    totalFocusTime: 0,
    streak: 0,
    lastSessionDate: null
  });

  // Refs
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const tickingSoundRef = useRef(null);

  // Get session durations
  const getSessionDuration = useCallback((sessionType) => {
    switch (sessionType) {
      case 'focus': return settings.focusTime * 60;
      case 'shortBreak': return settings.shortBreakTime * 60;
      case 'longBreak': return settings.longBreakTime * 60;
      default: return settings.focusTime * 60;
    }
  }, [settings]);

  // Initialize timer with current session duration
  useEffect(() => {
    if (!isActive && !isPaused) {
      setTimeLeft(getSessionDuration(currentSession));
    }
  }, [currentSession, settings, isActive, isPaused, getSessionDuration]);

  // Load saved data on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoro-settings');
    const savedStats = localStorage.getItem('pomodoro-stats');
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    if (savedStats) {
      const parsedStats = JSON.parse(savedStats);
      setStats(parsedStats);
      
      // Check if it's a new day
      const today = new Date().toDateString();
      if (parsedStats.lastSessionDate !== today) {
        setStats(prev => ({ ...prev, todaysSessions: 0, lastSessionDate: today }));
      }
    }
  }, []);

  // Save settings and stats
  useEffect(() => {
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
  }, [stats]);

  // Audio setup
  useEffect(() => {
    // Create audio context for better sound control
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback((type = 'complete') => {
    if (!settings.notificationSound) return;
    
    try {
      // Create different tones for different events
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Different frequencies for different events
      const frequencies = {
        complete: [800, 600, 400], // Descending tone
        start: [400, 600], // Rising tone
        tick: [1000] // Single high tone
      };
      
      const freqs = frequencies[type] || frequencies.complete;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(settings.volume * 0.3, ctx.currentTime + 0.01);
      
      freqs.forEach((freq, index) => {
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.2);
      });
      
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + freqs.length * 0.2 + 0.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + freqs.length * 0.2 + 0.5);
    } catch (error) {
      console.log('Audio playback error:', error);
    }
  }, [settings.notificationSound, settings.volume]);

  // Start ticking sound
  const startTickingSound = useCallback(() => {
    if (!settings.playTickingSound || tickingSoundRef.current) return;
    
    tickingSoundRef.current = setInterval(() => {
      playNotificationSound('tick');
    }, 1000);
  }, [settings.playTickingSound, playNotificationSound]);

  // Stop ticking sound
  const stopTickingSound = useCallback(() => {
    if (tickingSoundRef.current) {
      clearInterval(tickingSoundRef.current);
      tickingSoundRef.current = null;
    }
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            // Timer completed
            setIsActive(false);
            setIsPaused(false);
            stopTickingSound();
            
            // Play completion sound
            playNotificationSound('complete');
            
            // Update statistics
            const today = new Date().toDateString();
            setStats(prev => ({
              ...prev,
              todaysSessions: prev.todaysSessions + 1,
              totalSessions: prev.totalSessions + 1,
              totalFocusTime: currentSession === 'focus' 
                ? prev.totalFocusTime + settings.focusTime 
                : prev.totalFocusTime,
              lastSessionDate: today,
              streak: currentSession === 'focus' ? prev.streak + 1 : prev.streak
            }));
            
            // Handle session transitions
            if (currentSession === 'focus') {
              setCompletedSessions(prev => prev + 1);
              const newSessionCount = sessionCount + 1;
              setSessionCount(newSessionCount);
              
              // Determine next break type
              const nextSession = newSessionCount % settings.sessionsUntilLongBreak === 0 
                ? 'longBreak' 
                : 'shortBreak';
              
              setCurrentSession(nextSession);
              
              // Auto-start break if enabled
              if (settings.autoStartBreaks) {
                setTimeout(() => {
                  setIsActive(true);
                  startTickingSound();
                }, 1000);
              }
              
              // Voice notification
              const message = nextSession === 'longBreak' 
                ? "Focus session complete! Time for a long break."
                : "Focus session complete! Time for a short break.";
              
              window.dispatchEvent(new CustomEvent('speak-message', {
                detail: { message }
              }));
              
            } else {
              // Break completed
              setCurrentSession('focus');
              
              // Auto-start focus if enabled
              if (settings.autoStartFocus) {
                setTimeout(() => {
                  setIsActive(true);
                  startTickingSound();
                }, 1000);
              }
              
              // Voice notification
              window.dispatchEvent(new CustomEvent('speak-message', {
                detail: { message: "Break time over! Ready to focus?" }
              }));
            }
            
            return getSessionDuration(currentSession === 'focus' ? 
              (sessionCount + 1) % settings.sessionsUntilLongBreak === 0 ? 'longBreak' : 'shortBreak'
              : 'focus');
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopTickingSound();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopTickingSound();
    };
  }, [isActive, isPaused, currentSession, sessionCount, settings, getSessionDuration, playNotificationSound, startTickingSound, stopTickingSound]);

  // Voice command handling
  useEffect(() => {
    const handleVoiceCommand = (event) => {
      if (!event.detail || !event.detail.transcript) return;
      
      const command = event.detail.transcript.toLowerCase();
      
      if (command.includes('start') || command.includes('resume') || command.includes('begin')) {
        handleStart();
      } else if (command.includes('pause') || command.includes('stop')) {
        handlePause();
      } else if (command.includes('reset')) {
        handleReset();
      } else if (command.includes('skip') || command.includes('next')) {
        handleSkip();
      } else if (command.includes('settings') || command.includes('configure')) {
        setShowSettings(true);
      } else if (command.includes('stats') || command.includes('statistics')) {
        setShowStats(true);
      } else if (command.includes('close') || command.includes('exit')) {
        onClose();
      }
    };

    window.addEventListener('voice-command', handleVoiceCommand);
    return () => window.removeEventListener('voice-command', handleVoiceCommand);
  }, [onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.target.tagName === 'INPUT') return;
      
      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          isActive ? handlePause() : handleStart();
          break;
        case 'r':
          event.preventDefault();
          handleReset();
          break;
        case 's':
          event.preventDefault();
          handleSkip();
          break;
        case 'escape':
          if (showSettings) setShowSettings(false);
          else if (showStats) setShowStats(false);
          else onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, showSettings, showStats, onClose]);

  // Timer controls
  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    playNotificationSound('start');
    startTickingSound();
  };

  const handlePause = () => {
    setIsPaused(true);
    stopTickingSound();
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(getSessionDuration(currentSession));
    stopTickingSound();
  };

  const handleSkip = () => {
    setIsActive(false);
    setIsPaused(false);
    
    // Move to next session
    if (currentSession === 'focus') {
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      setCompletedSessions(prev => prev + 1);
      
      const nextSession = newSessionCount % settings.sessionsUntilLongBreak === 0 
        ? 'longBreak' 
        : 'shortBreak';
      setCurrentSession(nextSession);
    } else {
      setCurrentSession('focus');
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getProgress = () => {
    const totalDuration = getSessionDuration(currentSession);
    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  // Get session display info
  const getSessionInfo = () => {
    const info = {
      focus: { 
        title: 'Focus Time', 
        color: '#3b82f6', 
        bgColor: 'rgba(59, 130, 246, 0.1)',
        icon: '🎯'
      },
      shortBreak: { 
        title: 'Short Break', 
        color: '#10b981', 
        bgColor: 'rgba(16, 185, 129, 0.1)',
        icon: '☕'
      },
      longBreak: { 
        title: 'Long Break', 
        color: '#8b5cf6', 
        bgColor: 'rgba(139, 92, 246, 0.1)',
        icon: '🌟'
      }
    };
    return info[currentSession] || info.focus;
  };

  const sessionInfo = getSessionInfo();

  if (showSettings) {
    return (
      <div className="module-overlay">
        <div className="pomodoro-container">
          <button className="close-button" onClick={() => setShowSettings(false)}>✕</button>
          
          <div className="pomodoro-header">
            <h2>⚙️ Settings</h2>
          </div>
          
          <div className="settings-panel">
            <div className="settings-section">
              <h3>Timer Duration (minutes)</h3>
              <div className="setting-row">
                <label>Focus Time:</label>
                <input 
                  type="number" 
                  min="1" 
                  max="60" 
                  value={settings.focusTime}
                  onChange={(e) => setSettings(prev => ({...prev, focusTime: parseInt(e.target.value) || 25}))}
                />
              </div>
              <div className="setting-row">
                <label>Short Break:</label>
                <input 
                  type="number" 
                  min="1" 
                  max="30" 
                  value={settings.shortBreakTime}
                  onChange={(e) => setSettings(prev => ({...prev, shortBreakTime: parseInt(e.target.value) || 5}))}
                />
              </div>
              <div className="setting-row">
                <label>Long Break:</label>
                <input 
                  type="number" 
                  min="1" 
                  max="60" 
                  value={settings.longBreakTime}
                  onChange={(e) => setSettings(prev => ({...prev, longBreakTime: parseInt(e.target.value) || 15}))}
                />
              </div>
              <div className="setting-row">
                <label>Sessions until Long Break:</label>
                <input 
                  type="number" 
                  min="2" 
                  max="10" 
                  value={settings.sessionsUntilLongBreak}
                  onChange={(e) => setSettings(prev => ({...prev, sessionsUntilLongBreak: parseInt(e.target.value) || 4}))}
                />
              </div>
            </div>
            
            <div className="settings-section">
              <h3>Auto-Start</h3>
              <div className="setting-row">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.autoStartBreaks}
                    onChange={(e) => setSettings(prev => ({...prev, autoStartBreaks: e.target.checked}))}
                  />
                  Auto-start breaks
                </label>
              </div>
              <div className="setting-row">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.autoStartFocus}
                    onChange={(e) => setSettings(prev => ({...prev, autoStartFocus: e.target.checked}))}
                  />
                  Auto-start focus sessions
                </label>
              </div>
            </div>
            
            <div className="settings-section">
              <h3>Audio</h3>
              <div className="setting-row">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.playTickingSound}
                    onChange={(e) => setSettings(prev => ({...prev, playTickingSound: e.target.checked}))}
                  />
                  Play ticking sound
                </label>
              </div>
              <div className="setting-row">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.notificationSound}
                    onChange={(e) => setSettings(prev => ({...prev, notificationSound: e.target.checked}))}
                  />
                  Play notification sounds
                </label>
              </div>
              <div className="setting-row">
                <label>Volume:</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={settings.volume}
                  onChange={(e) => setSettings(prev => ({...prev, volume: parseFloat(e.target.value)}))}
                />
                <span>{Math.round(settings.volume * 100)}%</span>
              </div>
            </div>
            
            <div className="settings-actions">
              <button className="control-btn" onClick={() => setShowSettings(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showStats) {
    return (
      <div className="module-overlay">
        <div className="pomodoro-container">
          <button className="close-button" onClick={() => setShowStats(false)}>✕</button>
          
          <div className="pomodoro-header">
            <h2>📊 Statistics</h2>
          </div>
          
          <div className="stats-panel">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{stats.todaysSessions}</div>
                <div className="stat-label">Today's Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalSessions}</div>
                <div className="stat-label">Total Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{Math.round(stats.totalFocusTime / 60)}h</div>
                <div className="stat-label">Total Focus Time</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.streak}</div>
                <div className="stat-label">Current Streak</div>
              </div>
            </div>
            
            <div className="current-session-stats">
              <h3>Current Session</h3>
              <div className="session-progress">
                <div className="session-indicator">
                  <span>Completed: {completedSessions}</span>
                  <span>Session: {sessionCount + 1}</span>
                </div>
                <div className="session-dots">
                  {Array.from({ length: settings.sessionsUntilLongBreak }, (_, i) => (
                    <div 
                      key={i}
                      className={`session-dot ${i < (sessionCount % settings.sessionsUntilLongBreak) ? 'completed' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="stats-actions">
              <button 
                className="control-btn reset"
                onClick={() => {
                  if (confirm('Reset all statistics? This cannot be undone.')) {
                    setStats({
                      todaysSessions: 0,
                      totalSessions: 0,
                      totalFocusTime: 0,
                      streak: 0,
                      lastSessionDate: new Date().toDateString()
                    });
                  }
                }}
              >
                Reset Stats
              </button>
              <button className="control-btn" onClick={() => setShowStats(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-overlay">
      <div className="pomodoro-container">
        <button className="close-button" onClick={onClose}>✕</button>
        
        <div className="pomodoro-header">
          <h2 style={{ color: sessionInfo.color }}>
            {sessionInfo.icon} {sessionInfo.title}
          </h2>
          <div className="session-counter">
            Session {sessionCount + 1} • {completedSessions} completed today
          </div>
        </div>
        
        <div className="timer-circle-container">
          <div className="timer-circle">
            <svg className="progress-ring" width="300" height="300">
              <circle
                className="progress-ring-background"
                cx="150"
                cy="150"
                r="140"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
              />
              <circle
                className="progress-ring-progress"
                cx="150"
                cy="150"
                r="140"
                fill="transparent"
                stroke={sessionInfo.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 140}`}
                strokeDashoffset={`${2 * Math.PI * 140 * (1 - getProgress() / 100)}`}
                transform="rotate(-90 150 150)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="timer-display">
              <div className="time">{formatTime(timeLeft)}</div>
              <div className="timer-status">
                {isActive && !isPaused ? 'Running' : isPaused ? 'Paused' : 'Ready'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="session-indicators">
          {Array.from({ length: settings.sessionsUntilLongBreak }, (_, i) => (
            <div 
              key={i}
              className={`session-dot ${i < (sessionCount % settings.sessionsUntilLongBreak) ? 'completed' : ''} ${i === (sessionCount % settings.sessionsUntilLongBreak) && currentSession === 'focus' ? 'current' : ''}`}
            />
          ))}
        </div>
        
        <div className="timer-controls">
          <div className="main-controls">
            <button 
              className={`control-btn ${isActive && !isPaused ? 'pause' : 'start'}`}
              onClick={isActive && !isPaused ? handlePause : handleStart}
            >
              {isActive && !isPaused ? '⏸️ Pause' : '▶️ Start'}
            </button>
            <button className="control-btn reset" onClick={handleReset}>
              🔄 Reset
            </button>
            <button className="control-btn skip" onClick={handleSkip}>
              ⏭️ Skip
            </button>
          </div>
          
          <div className="secondary-controls">
            <button className="control-btn settings" onClick={() => setShowSettings(true)}>
              ⚙️ Settings
            </button>
            <button className="control-btn stats" onClick={() => setShowStats(true)}>
              📊 Stats
            </button>
          </div>
        </div>
        
        <div className="keyboard-shortcuts">
          <p>Keyboard shortcuts:</p>
          <div className="shortcuts-grid">
            <span>Space</span><span>Start/Pause</span>
            <span>R</span><span>Reset</span>
            <span>S</span><span>Skip</span>
            <span>Esc</span><span>Close</span>
          </div>
        </div>
        
        <div className="voice-commands">
          <p>Voice commands:</p>
          <ul>
            <li>"Start timer" / "Pause timer"</li>
            <li>"Reset timer" / "Skip session"</li>
            <li>"Show settings" / "Show stats"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;