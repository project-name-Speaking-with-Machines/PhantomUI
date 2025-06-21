// Central registry for all modules
import WordleGame from '../components/WordleGame.jsx';
import WeatherModule from './weather/index.jsx';

export const MODULE_REGISTRY = {
  wordle: {
    component: WordleGame,
    aliases: ['wordle', 'word game', 'word puzzle', 'guess word'],
    keywords: ['play', 'game', 'wordle', 'word'],
    description: 'A word guessing game'
  },
  weather: {
    component: WeatherModule,
    aliases: ['weather', 'forecast', 'temperature', 'climate'],
    keywords: ['weather', 'temperature', 'forecast', 'rain', 'sunny'],
    description: 'Current weather information'
  }
};

// Helper function to find module by voice command
export const findModuleByCommand = (command) => {
  const lowerCommand = command.toLowerCase().trim();
  
  for (const [moduleId, module] of Object.entries(MODULE_REGISTRY)) {
    // Check direct aliases
    if (module.aliases.some(alias => lowerCommand.includes(alias))) {
      return { moduleId, module };
    }
    
    // Check if command contains relevant keywords
    const keywordMatches = module.keywords.filter(keyword => 
      lowerCommand.includes(keyword)
    ).length;
    
    if (keywordMatches >= 1) {
      return { moduleId, module };
    }
  }
  
  return null;
};

// Get all available modules for help commands
export const getAllModules = () => {
  return Object.entries(MODULE_REGISTRY).map(([id, module]) => ({
    id,
    description: module.description,
    aliases: module.aliases
  }));
};
