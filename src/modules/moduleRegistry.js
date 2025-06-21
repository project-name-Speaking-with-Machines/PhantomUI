// Central registry for all modules
import WordleGame from '../components/WordleGame.jsx';
import WeatherModule from './weather/index.jsx';
import PomodoroTimer from './pomodoro/index.jsx';
import RecipeDisplay from './recipe/index.jsx';
import FlightTracker from './flight/index.jsx';

export const MODULE_REGISTRY = {
  wordle: {
    component: WordleGame,
    aliases: ['wordle', 'word game', 'word puzzle', 'guess word', 'play words'],
    keywords: ['play', 'game', 'wordle', 'word', 'guess', 'puzzle'],
    description: 'A word guessing game'
  },
  weather: {
    component: WeatherModule,
    aliases: ['weather', 'forecast', 'temperature', 'climate', 'rain', 'sunny', 'how hot', 'how cold'],
    keywords: ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'wind', 'humidity', 'climate'],
    description: 'Current weather information'
  },
  pomodoro: {
    component: PomodoroTimer,
    aliases: ['pomodoro', 'timer', 'set timer', 'focus timer', 'countdown', 'study timer'],
    keywords: ['pomodoro', 'timer', 'minutes', 'focus', 'countdown', 'time', 'set'],
    description: 'Pomodoro focus timer'
  },
  recipe: {
    component: RecipeDisplay,
    aliases: ['recipe', 'food', 'how to make', 'how to cook', 'dish', 'meal', 'cooking'],
    keywords: ['recipe', 'cook', 'food', 'meal', 'dish', 'ingredient', 'how to make'],
    description: 'Recipe finder and display'
  },
  flight: {
    component: FlightTracker,
    aliases: ['flight', 'track flight', 'flight status', 'plane', 'airport', 'flight tracker'],
    keywords: ['flight', 'track', 'plane', 'airline', 'airport', 'departure', 'arrival'],
    description: 'Flight tracking information'
  }
};

// Helper function to find module by voice command with improved context understanding
export const findModuleByCommand = (command) => {
  if (!command) return null;
  
  const lowerCommand = command.toLowerCase().trim();
  
  // Check for direct module references first
  for (const [moduleId, module] of Object.entries(MODULE_REGISTRY)) {
    // Check direct aliases (exact matches)
    if (module.aliases.some(alias => lowerCommand.includes(alias))) {
      return { moduleId, module };
    }
  }
  
  // Intent-based matching with weighted approach
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [moduleId, module] of Object.entries(MODULE_REGISTRY)) {
    // Count how many keywords match to determine relevance
    const keywordMatches = module.keywords.filter(keyword => 
      lowerCommand.includes(keyword)
    ).length;
    
    // Calculate a score based on keyword density and relevance
    let score = keywordMatches;
    
    // Add weight if certain strong indicators are present
    if (moduleId === 'wordle' && /\b[a-z]{5}\b/.test(lowerCommand)) {
      score += 3; // Likely a 5-letter word for Wordle
    }
    
    if (moduleId === 'pomodoro' && /\d+\s*min(ute)?s?/.test(lowerCommand)) {
      score += 3; // Mentioning minutes strongly indicates timer
    }
    
    if (moduleId === 'weather' && /\bin\s+[a-z\s]+\b/.test(lowerCommand)) {
      score += 2; // "in [location]" pattern likely indicates weather query
    }
    
    if (moduleId === 'recipe' && /\bhow\s+to\s+(make|cook)\b/.test(lowerCommand)) {
      score += 3; // "How to make/cook" strongly indicates recipe
    }
    
    if (moduleId === 'flight' && /\b[a-z]{2}\d{1,4}\b/i.test(lowerCommand)) {
      score += 3; // Likely flight number pattern (e.g., AA123)
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { moduleId, module };
    }
  }
  
  // Only return a match if the score is significant enough
  return highestScore >= 1 ? bestMatch : null;
};

// Get all available modules for help commands
export const getAllModules = () => {
  return Object.entries(MODULE_REGISTRY).map(([id, module]) => ({
    id,
    description: module.description,
    aliases: module.aliases
  }));
};

// Helper function to check if the command is asking about Phantom itself
export const isIdentityQuestion = (command) => {
  if (!command) return false;
  
  const lowerCommand = command.toLowerCase().trim();
  const identityPhrases = [
    'who are you', 
    'what are you', 
    'your name', 
    'tell me about yourself',
    'what can you do',
    'what is phantom',
    'what is this',
    'help me'
  ];
  
  return identityPhrases.some(phrase => lowerCommand.includes(phrase));
};
