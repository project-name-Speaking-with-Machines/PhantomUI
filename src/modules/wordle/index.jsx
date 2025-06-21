import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { speak } from "../../hooks/useTTS";

const WORDS = ["REACT", "VITES", "PHONE", "GHOST", "MAGIC", "VOICE", "DREAM", "LIGHT", "SPACE", "WORLD"];
const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];

const WordleModule = forwardRef((props, ref) => {
  const [targetWord, setTargetWord] = useState(() => getRandomWord());
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState("playing"); // playing, won, lost
  const [isInputMode, setIsInputMode] = useState(false);

  useEffect(() => {
    speak("Let's play Wordle! I've picked a five-letter word. You can guess the word letter by letter, or say a complete five-letter word.");
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleVoiceCommand: async (command) => {
      const text = command.toLowerCase().trim();
      
      // Handle game control commands
      if (text.includes('new game') || text.includes('restart')) {
        startNewGame();
        return true;
      }
      
      if (text.includes('give up') || text.includes('show answer')) {
        speak(`The word was ${targetWord}`);
        setGameStatus("lost");
        return true;
      }

      if (text.includes('hint') || text.includes('help')) {
        giveHint();
        return true;
      }

      if (gameStatus !== "playing") {
        if (text.includes('play again')) {
          startNewGame();
          return true;
        }
        return false;
      }

      // Handle letter input
      if (text.length === 1 && /[a-z]/.test(text)) {
        addLetter(text.toUpperCase());
        return true;
      }

      // Handle word guesses
      if (text.length === 5 && /^[a-z]+$/.test(text)) {
        submitGuess(text.toUpperCase());
        return true;
      }

      // Handle backspace/delete
      if (text.includes('delete') || text.includes('backspace') || text.includes('remove')) {
        removeLetter();
        return true;
      }

      // Handle submit
      if (text.includes('submit') || text.includes('enter') || text.includes('guess')) {
        if (currentGuess.length === 5) {
          submitGuess(currentGuess);
        } else {
          speak("You need to complete the five-letter word first.");
        }
        return true;
      }

      return false; // Command not handled
    }
  }));

  const startNewGame = () => {
    const newWord = getRandomWord();
    setTargetWord(newWord);
    setGuesses([]);
    setCurrentGuess("");
    setGameStatus("playing");
    speak("New game started! Guess a five-letter word.");
  };

  const addLetter = (letter) => {
    if (currentGuess.length < 5) {
      const newGuess = currentGuess + letter;
      setCurrentGuess(newGuess);
      speak(letter);
    } else {
      speak("Word is already complete. Say 'submit' to guess or 'delete' to remove letters.");
    }
  };

  const removeLetter = () => {
    if (currentGuess.length > 0) {
      const newGuess = currentGuess.slice(0, -1);
      setCurrentGuess(newGuess);
      speak("Deleted");
    }
  };

  const submitGuess = (word) => {
    if (word.length !== 5) {
      speak("Please provide a five-letter word.");
      return;
    }

    const newGuesses = [...guesses, word];
    setGuesses(newGuesses);
    setCurrentGuess("");

    if (word === targetWord) {
      setGameStatus("won");
      speak(`Excellent! You got it! The word was ${targetWord}. Say 'play again' for a new game.`);
    } else if (newGuesses.length >= 6) {
      setGameStatus("lost");
      speak(`Game over! The word was ${targetWord}. Say 'play again' for a new game.`);
    } else {
      // Give feedback
      provideFeedback(word);
    }
  };

  const provideFeedback = (guess) => {
    let feedback = "";
    let correctPositions = 0;
    let correctLetters = 0;

    for (let i = 0; i < 5; i++) {
      const letter = guess[i];
      if (letter === targetWord[i]) {
        correctPositions++;
      } else if (targetWord.includes(letter)) {
        correctLetters++;
      }
    }

    if (correctPositions > 0) {
      feedback += `${correctPositions} letter${correctPositions > 1 ? 's' : ''} in the right position. `;
    }
    if (correctLetters > 0) {
      feedback += `${correctLetters} letter${correctLetters > 1 ? 's' : ''} in the word but wrong position. `;
    }
    if (correctPositions === 0 && correctLetters === 0) {
      feedback = "None of those letters are in the word. ";
    }

    speak(feedback + "Try again!");
  };

  const giveHint = () => {
    if (guesses.length === 0) {
      speak("Here's a hint: the first letter is " + targetWord[0]);
    } else {
      // Find a letter that hasn't been guessed correctly
      const allGuessedLetters = guesses.join('').split('');
      const unguessedLetters = targetWord.split('').filter(letter => 
        !allGuessedLetters.includes(letter)
      );
      
      if (unguessedLetters.length > 0) {
        speak("The word contains the letter " + unguessedLetters[0]);
      } else {
        speak("You've found all the letters, just need to get them in the right positions!");
      }
    }
  };

  const getLetterStatus = (letter, position, guessIndex) => {
    const guess = guesses[guessIndex];
    if (guess[position] === targetWord[position]) {
      return 'correct'; // Green
    } else if (targetWord.includes(letter)) {
      return 'present'; // Yellow
    } else {
      return 'absent'; // Gray
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>🎯 Wordle</h2>
        <div style={statusStyle}>
          {gameStatus === "playing" && `Guess ${guesses.length + 1}/6`}
          {gameStatus === "won" && "🎉 You Won!"}
          {gameStatus === "lost" && "😔 Game Over"}
        </div>
      </div>

      <div style={gridStyle}>
        {/* Previous guesses */}
        {guesses.map((guess, guessIndex) => (
          <div key={guessIndex} style={rowStyle}>
            {guess.split('').map((letter, letterIndex) => (
              <div
                key={letterIndex}
                style={{
                  ...cellStyle,
                  ...getColorForStatus(getLetterStatus(letter, letterIndex, guessIndex))
                }}
              >
                {letter}
              </div>
            ))}
          </div>
        ))}

        {/* Current guess */}
        {gameStatus === "playing" && guesses.length < 6 && (
          <div style={rowStyle}>
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                style={{
                  ...cellStyle,
                  ...currentCellStyle,
                  transform: i < currentGuess.length ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                {currentGuess[i] || ''}
              </div>
            ))}
          </div>
        )}

        {/* Empty rows */}
        {Array.from({ length: Math.max(0, 5 - guesses.length) }, (_, i) => (
          <div key={`empty-${i}`} style={rowStyle}>
            {Array.from({ length: 5 }, (_, j) => (
              <div key={j} style={cellStyle}></div>
            ))}
          </div>
        ))}
      </div>

      <div style={instructionsStyle}>
        <div>🎤 Voice Commands:</div>
        <div style={commandsStyle}>
          • Say letters: "A", "B", "C"...</div>
        <div style={commandsStyle}>• Say complete word: "GHOST"</div>
        <div style={commandsStyle}>• "Delete" to remove letters</div>
        <div style={commandsStyle}>• "Submit" to guess current word</div>
        <div style={commandsStyle}>• "Hint" for help</div>
        <div style={commandsStyle}>• "New game" to restart</div>
      </div>

      <button style={closeButtonStyle} onClick={props.onClose}>
        ✕ Close
      </button>
    </div>
  );
});

function getColorForStatus(status) {
  switch (status) {
    case 'correct':
      return { backgroundColor: '#6aaa64', borderColor: '#6aaa64' };
    case 'present':
      return { backgroundColor: '#c9b458', borderColor: '#c9b458' };
    case 'absent':
      return { backgroundColor: '#787c7e', borderColor: '#787c7e' };
    default:
      return {};
  }
}

const containerStyle = {
  background: 'rgba(20, 20, 20, 0.95)',
  backdropFilter: 'blur(20px)',
  padding: 30,
  borderRadius: 20,
  color: '#fff',
  textAlign: 'center',
  maxWidth: 500,
  width: '90%',
  position: 'relative',
};

const headerStyle = {
  marginBottom: 30,
};

const titleStyle = {
  margin: 0,
  fontSize: 32,
  fontWeight: 300,
};

const statusStyle = {
  marginTop: 10,
  fontSize: 16,
  opacity: 0.8,
};

const gridStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  marginBottom: 30,
  alignItems: 'center',
};

const rowStyle = {
  display: 'flex',
  gap: 5,
};

const cellStyle = {
  width: 60,
  height: 60,
  border: '2px solid #3a3a3c',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 24,
  fontWeight: 'bold',
  borderRadius: 4,
  transition: 'all 0.3s ease',
};

const currentCellStyle = {
  borderColor: '#565758',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
};

const instructionsStyle = {
  textAlign: 'left',
  fontSize: 14,
  opacity: 0.8,
  marginBottom: 20,
};

const commandsStyle = {
  marginLeft: 10,
  marginTop: 5,
};

const closeButtonStyle = {
  position: 'absolute',
  top: 15,
  right: 15,
  background: 'rgba(255, 255, 255, 0.1)',
  border: 'none',
  color: '#fff',
  padding: '8px 12px',
  borderRadius: 20,
  cursor: 'pointer',
  fontSize: 14,
};

export default WordleModule;
