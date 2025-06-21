import { useState, useEffect, useCallback } from 'react';

const WORDS = [
  'REACT', 'VOICE', 'SMART', 'GHOST', 'MAGIC', 'QUICK', 'BLEND', 'STORM',
  'LIGHT', 'SPACE', 'DREAM', 'FLASH', 'SPARK', 'CRISP', 'SWIFT', 'SHINE',
  'FROST', 'CLEAR', 'BRAVE', 'THINK', 'POWER', 'WORLD', 'SOUND', 'PIXEL'
];

export default function WordleGame({ onClose }) {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('playing'); // playing, won, lost
  const [currentRow, setCurrentRow] = useState(0);

  // Initialize game
  useEffect(() => {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(randomWord);
    console.log('Target word:', randomWord); // For debugging
  }, []);

  // Handle keyboard input
  const handleKeyPress = useCallback((event) => {
    if (gameStatus !== 'playing') return;

    const key = event.key.toUpperCase();
    
    if (key === 'ENTER') {
      if (currentGuess.length === 5) {
        submitGuess();
      }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key.match(/[A-Z]/) && currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  }, [currentGuess, gameStatus]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const submitGuess = () => {
    if (currentGuess.length !== 5) return;

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);
    setCurrentRow(prev => prev + 1);

    if (currentGuess === targetWord) {
      setGameStatus('won');
    } else if (newGuesses.length >= 6) {
      setGameStatus('lost');
    }

    setCurrentGuess('');
  };

  const getLetterStatus = (letter, position, word) => {
    if (word[position] === targetWord[position]) {
      return 'correct';
    } else if (targetWord.includes(letter)) {
      return 'present';
    } else {
      return 'absent';
    }
  };

  const resetGame = () => {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(randomWord);
    setGuesses([]);
    setCurrentGuess('');
    setCurrentRow(0);
    setGameStatus('playing');
    console.log('New target word:', randomWord);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
        borderRadius: '20px',
        padding: '30px',
        border: '2px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        minWidth: '400px',
        textAlign: 'center',
        animation: 'slideIn 0.5s ease-out'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            color: '#fff',
            margin: 0,
            fontSize: '1.8rem',
            background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}>
            🎮 Wordle
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1.2rem',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            ✕
          </button>
        </div>

        {/* Game Board */}
        <div style={{
          display: 'grid',
          gridTemplateRows: 'repeat(6, 1fr)',
          gap: '5px',
          marginBottom: '20px',
          maxWidth: '300px',
          margin: '0 auto 20px auto'
        }}>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={rowIndex} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '5px'
            }}>
              {Array.from({ length: 5 }).map((_, colIndex) => {
                let letter = '';
                let status = '';
                
                if (rowIndex < guesses.length) {
                  letter = guesses[rowIndex][colIndex];
                  status = getLetterStatus(letter, colIndex, guesses[rowIndex]);
                } else if (rowIndex === currentRow) {
                  letter = currentGuess[colIndex] || '';
                }

                return (
                  <div
                    key={colIndex}
                    style={{
                      width: '50px',
                      height: '50px',
                      border: `2px solid ${
                        status === 'correct' ? '#6aaa64' :
                        status === 'present' ? '#c9b458' :
                        status === 'absent' ? '#787c7e' :
                        letter ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'
                      }`,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#fff',
                      background: status === 'correct' ? '#6aaa64' :
                                status === 'present' ? '#c9b458' :
                                status === 'absent' ? '#787c7e' :
                                'rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.3s ease',
                      animation: letter && rowIndex === currentRow ? 'bounce 0.3s ease' : 'none'
                    }}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Game Status */}
        {gameStatus !== 'playing' && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            borderRadius: '10px',
            background: gameStatus === 'won' ? 
              'linear-gradient(45deg, #6aaa64, #4ecdc4)' : 
              'linear-gradient(45deg, #ff6b6b, #ff8e8e)',
            color: '#fff',
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }}>
            {gameStatus === 'won' ? 
              `🎉 Congratulations! You won in ${guesses.length} guesses!` :
              `😔 Game Over! The word was: ${targetWord}`
            }
          </div>
        )}

        {/* Current Guess Display */}
        {gameStatus === 'playing' && (
          <div style={{
            marginBottom: '20px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.9rem'
          }}>
            Type your 5-letter guess and press Enter
            {currentGuess && (
              <div style={{ marginTop: '10px', fontSize: '1.1rem', color: '#fff' }}>
                Current: {currentGuess}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center'
        }}>
          {gameStatus !== 'playing' && (
            <button
              onClick={resetGame}
              style={{
                background: 'linear-gradient(45deg, #4ecdc4, #45b7d1)',
                border: 'none',
                borderRadius: '25px',
                padding: '12px 24px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              🔄 Play Again
            </button>
          )}
          
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '25px',
              padding: '12px 24px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
          >
            Close Game
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '20px',
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.5)',
          lineHeight: '1.4'
        }}>
          🟩 Correct letter & position<br/>
          🟨 Letter in word, wrong position<br/>
          ⬛ Letter not in word
        </div>
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideIn {
            from { 
              opacity: 0;
              transform: translateY(-50px) scale(0.9);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          @keyframes bounce {
            0%, 20%, 60%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            80% { transform: translateY(-5px); }
          }
        `}
      </style>
    </div>
  );
}
