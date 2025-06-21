import { useState, useEffect } from 'react';
import OpenAI from 'openai';

const RecipeDisplay = ({ onClose }) => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState('standard'); // 'standard' or 'flashcard'
  const [currentCard, setCurrentCard] = useState(0);
  
  // Initialize OpenAI client with the environment variable
  const openAIKey = import.meta.env.VITE_OPENAI_KEY;
  console.log("OpenAI Key available:", !!openAIKey);
  
  // Create openai instance only when needed to avoid potential issues
  const getOpenAIClient = () => {
    return new OpenAI({
      apiKey: openAIKey,
      dangerouslyAllowBrowser: true
    });
  };
  
  // Extract recipe query from URL parameters if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeQuery = urlParams.get('recipe');
    
    if (recipeQuery) {
      console.log(`Found recipe query in URL: ${recipeQuery}`);
      setSearchTerm(recipeQuery);
      setInitialLoad(false);
    }
  }, []);
  
  // Fetch recipe from OpenAI based on search term
  useEffect(() => {
    const fetchRecipe = async (query) => {
      if (!query) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching recipe for: ${query}`);
        
        // Fallback recipe in case API fails
        const fallbackRecipe = {
          title: `Recipe for ${query}`,
          description: `A delicious way to prepare ${query}.`,
          ingredients: [
            "Main ingredient: " + query,
            "Seasonings to taste",
            "Additional ingredients based on preference"
          ],
          instructions: [
            "Prepare ingredients according to standard methods",
            "Combine ingredients following basic cooking principles",
            "Cook until done to your preference",
            "Serve and enjoy!"
          ],
          prepTime: "15 minutes",
          cookTime: "30 minutes",
          servings: 4,
          difficulty: "Medium"
        };
        
        if (!openAIKey) {
          console.error("OpenAI API key is missing");
          // Use fallback recipe instead of throwing error
          setRecipe(fallbackRecipe);
          setLoading(false);
          return;
        }
        
        // Create a new OpenAI instance for this request
        const openai = getOpenAIClient();
        
        // Call OpenAI to get recipe information
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a helpful cooking assistant. Provide a detailed recipe for the requested dish.
              Return ONLY a valid JSON object with this exact format:
              {
                "title": "Recipe name",
                "description": "Brief description of the dish",
                "ingredients": ["ingredient 1", "ingredient 2", ...],
                "instructions": ["step 1", "step 2", ...],
                "prepTime": "preparation time",
                "cookTime": "cooking time",
                "servings": number,
                "difficulty": "Easy/Medium/Hard"
              }
              Do not include any explanations, markdown formatting, or anything else - ONLY the JSON object.`
            },
            {
              role: 'user',
              content: `Please provide a recipe for ${query} in the exact JSON format requested.`
            }
          ],
          temperature: 0.5,
          max_tokens: 1000
        });
        
        const responseText = response.choices[0].message.content.trim();
        console.log('OpenAI response received:', responseText.substring(0, 100) + '...');
        
        // Parse the JSON response
        let recipeData;
        try {
          // First try direct parsing
          try {
            recipeData = JSON.parse(responseText);
          } catch (directParseError) {
            // If direct parsing fails, try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              recipeData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("Could not extract valid JSON from response");
            }
          }
          
          // Validate the recipe data and use fallbacks for missing fields
          recipeData = {
            title: recipeData.title || `Recipe for ${query}`,
            description: recipeData.description || `A delicious ${query} recipe.`,
            ingredients: recipeData.ingredients || ["Ingredients not provided"],
            instructions: recipeData.instructions || ["Instructions not provided"],
            prepTime: recipeData.prepTime || "15 minutes",
            cookTime: recipeData.cookTime || "30 minutes",
            servings: recipeData.servings || 4,
            difficulty: recipeData.difficulty || "Medium"
          };
          
          setRecipe(recipeData);
          setLoading(false);
        } catch (parseError) {
          console.error('Error parsing recipe data:', parseError);
          
          // Try to extract useful information from the raw response
          let basicRecipe;
          
          try {
            // Try to extract JSON even with formatting issues
            const cleanedText = responseText.replace(/```json|```/g, '').trim();
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
              // Found something that looks like JSON
              const extractedJson = jsonMatch[0];
              console.log("Extracted JSON-like content:", extractedJson.substring(0, 50) + "...");
              
              try {
                // Try to parse it
                const parsedData = JSON.parse(extractedJson);
                
                // Use the parsed data with fallbacks
                basicRecipe = {
                  title: parsedData.title || `Recipe for ${query}`,
                  description: parsedData.description || `A delicious ${query} recipe.`,
                  ingredients: Array.isArray(parsedData.ingredients) ? parsedData.ingredients : [`Main ingredient: ${query}`],
                  instructions: Array.isArray(parsedData.instructions) ? 
                    // Clean up any JSON formatting in instructions
                    parsedData.instructions.map(step => step.replace(/[\{\}",]/g, '').trim()) : 
                    ["Follow standard cooking procedures for this dish"],
                  prepTime: parsedData.prepTime || "15 minutes",
                  cookTime: parsedData.cookTime || "30 minutes",
                  servings: parsedData.servings || 4,
                  difficulty: parsedData.difficulty || "Medium"
                };
              } catch (innerParseError) {
                // Parsing the extracted JSON-like content failed
                throw new Error("Failed to parse extracted JSON");
              }
            } else {
              throw new Error("No JSON-like content found");
            }
          } catch (extractError) {
            // Fallback if all parsing attempts fail
            basicRecipe = {
              title: `Recipe for ${query}`,
              description: `A delicious way to prepare ${query}.`,
              ingredients: [`Main ingredient: ${query}`, "Other ingredients as needed"],
              instructions: ["Prepare ingredients", "Cook following standard methods", "Serve and enjoy!"],
              prepTime: "15 minutes",
              cookTime: "30 minutes",
              servings: 4,
              difficulty: "Medium"
            };
          }
          
          setRecipe(basicRecipe);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching recipe:', err);
        
        // Create a generic recipe as a last resort
        const genericRecipe = {
          title: `Recipe for ${query}`,
          description: `A simple ${query} recipe.`,
          ingredients: [
            "Main ingredient: " + query,
            "Seasonings to taste",
            "Additional ingredients as needed"
          ],
          instructions: [
            "Prepare the ingredients",
            "Combine ingredients following standard cooking methods",
            "Cook until done",
            "Serve and enjoy!"
          ],
          prepTime: "15 minutes",
          cookTime: "30 minutes",
          servings: 4,
          difficulty: "Medium"
        };
        
        setRecipe(genericRecipe);
        setLoading(false);
      }
    };
    
    if (searchTerm) {
      fetchRecipe(searchTerm);
    }
  }, [searchTerm, openAIKey]);
  
  // Handle voice commands
  useEffect(() => {
    const handleVoiceCommand = (event) => {
      if (!event.detail || !event.detail.transcript) return;
      
      const command = event.detail.transcript.toLowerCase();
      console.log(`Recipe module received voice command: ${command}`);
      
      if (command.includes('close') || command.includes('exit')) {
        onClose();
        return;
      }
      
      // Use the direct command handler
      handleDirectRecipeCommand(command);
    };

    window.addEventListener('voice-command', handleVoiceCommand);
    return () => window.removeEventListener('voice-command', handleVoiceCommand);
  }, [onClose, searchTerm]);

  // Initialize with a default recipe if none is provided
  useEffect(() => {
    const checkForRecipe = () => {
      // First check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const recipeQuery = urlParams.get('recipe');
      
      if (recipeQuery) {
        console.log(`Found recipe query in URL: ${recipeQuery}`);
        setSearchTerm(recipeQuery);
        setInitialLoad(false);
        return;
      }
      
      // If no URL parameter and we're in initial load state, use default
      if (initialLoad && !searchTerm) {
        // Default to a simple recipe when first opened
        const defaultRecipes = ['chicken curry', 'chocolate cake', 'vegetable soup', 'beef stir fry', 'apple pie'];
        const randomRecipe = defaultRecipes[Math.floor(Math.random() * defaultRecipes.length)];
        
        console.log(`Setting default recipe: ${randomRecipe}`);
        setSearchTerm(randomRecipe);
        setInitialLoad(false);
      }
    };
    
    checkForRecipe();
  }, [initialLoad, searchTerm]);

  // Add a search input for manual recipe searches
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.recipeSearch.value.trim();
    if (input) {
      setSearchTerm(input);
      setInitialLoad(false);
    }
  };

  // Function to handle direct voice commands for recipe searches
  const handleDirectRecipeCommand = (command) => {
    if (!command) return;
    
    console.log(`Recipe component handling direct command: ${command}`);
    
    // Extract recipe query
    const recipeMatch = command.match(/recipe for (.*)/i) || 
                       command.match(/how (do I|to) (make|cook) (.*)/i) ||
                       command.match(/show me (a|how to make) (.*)/i) ||
                       command.match(/find (a|me) (.*) recipe/i);
    
    if (recipeMatch) {
      const food = recipeMatch[recipeMatch.length - 1].trim();
      console.log(`Recipe component extracted query: "${food}"`);
      
      if (food && food.toLowerCase() !== searchTerm.toLowerCase()) {
        setSearchTerm(food);
        setInitialLoad(false);
        return true;
      }
    }
    
    return false;
  };

  // Add this useEffect to listen for direct voice commands
  useEffect(() => {
    // Check URL parameters on component mount and when URL changes
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const recipeQuery = urlParams.get('recipe');
      
      if (recipeQuery && recipeQuery.toLowerCase() !== searchTerm.toLowerCase()) {
        console.log(`Recipe component found URL query: ${recipeQuery}`);
        setSearchTerm(recipeQuery);
        setInitialLoad(false);
      }
    };
    
    // Listen for URL changes
    window.addEventListener('popstate', handleUrlChange);
    
    // Initial check
    handleUrlChange();
    
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="module-overlay">
        <div className="recipe-container loading">
          <button className="close-button" onClick={onClose}>✕</button>
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <p>Finding the perfect recipe{searchTerm ? ` for ${searchTerm}` : ''}...</p>
          </div>
        </div>
      </div>
    );
  }

  // We're no longer showing error state, as we always provide a fallback recipe

  // Function to navigate through flashcards
  const navigateFlashcard = (direction) => {
    if (direction === 'next') {
      // Calculate total number of cards (ingredients + instructions)
      const totalCards = (recipe?.ingredients?.length || 0) + (recipe?.instructions?.length || 0) + 1;
      setCurrentCard((prev) => (prev + 1) % totalCards);
    } else {
      // Calculate total number of cards (ingredients + instructions)
      const totalCards = (recipe?.ingredients?.length || 0) + (recipe?.instructions?.length || 0) + 1;
      setCurrentCard((prev) => (prev - 1 + totalCards) % totalCards);
    }
  };

  // Render flashcard content based on current card index
  const renderFlashcardContent = () => {
    // Card 0 is the title and meta info
    if (currentCard === 0) {
      return (
        <div className="flashcard-content">
          <h2>{recipe?.title}</h2>
          <p className="recipe-description">{recipe?.description}</p>
          <div className="recipe-meta">
            <div className="meta-item">
              <span className="meta-label">Prep</span>
              <span className="meta-value">{recipe?.prepTime}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Cook</span>
              <span className="meta-value">{recipe?.cookTime}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Serves</span>
              <span className="meta-value">{recipe?.servings}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Difficulty</span>
              <span className="meta-value">{recipe?.difficulty}</span>
            </div>
          </div>
        </div>
      );
    }
    
    // Cards 1 to ingredients.length are ingredients
    const ingredientsLength = recipe?.ingredients?.length || 0;
    if (currentCard <= ingredientsLength) {
      const ingredientIndex = currentCard - 1;
      return (
        <div className="flashcard-content">
          <h3>Ingredient {currentCard} of {ingredientsLength}</h3>
          <p className="flashcard-text">{recipe?.ingredients[ingredientIndex]}</p>
        </div>
      );
    }
    
    // Cards after ingredients are instructions
    const instructionIndex = currentCard - ingredientsLength - 1;
    return (
      <div className="flashcard-content">
        <h3>Step {instructionIndex + 1} of {recipe?.instructions?.length}</h3>
        <p className="flashcard-text">{recipe?.instructions[instructionIndex]}</p>
      </div>
    );
  };

  return (
    <div className="module-overlay">
      <div className="recipe-container">
        <button className="close-button" onClick={onClose}>✕</button>
        
        {/* View mode toggle */}
        <div className="view-mode-toggle">
          <button 
            className={`view-mode-button ${viewMode === 'standard' ? 'active' : ''}`}
            onClick={() => setViewMode('standard')}
          >
            Standard View
          </button>
          <button 
            className={`view-mode-button ${viewMode === 'flashcard' ? 'active' : ''}`}
            onClick={() => setViewMode('flashcard')}
          >
            Flashcard View
          </button>
        </div>
        
        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="recipe-search-form">
          <input 
            type="text" 
            name="recipeSearch" 
            placeholder="Search for a recipe..." 
            className="recipe-search-input"
          />
          <button type="submit" className="recipe-search-button">Search</button>
        </form>
        
        {viewMode === 'standard' ? (
          <>
            <div className="recipe-header">
              <h2>{recipe?.title}</h2>
              <p className="recipe-description">{recipe?.description}</p>
              
              <div className="recipe-meta">
                <div className="meta-item">
                  <span className="meta-label">Prep</span>
                  <span className="meta-value">{recipe?.prepTime}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Cook</span>
                  <span className="meta-value">{recipe?.cookTime}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Serves</span>
                  <span className="meta-value">{recipe?.servings}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Difficulty</span>
                  <span className="meta-value">{recipe?.difficulty}</span>
                </div>
              </div>
            </div>
            
            <div className="recipe-content">
              <div className="ingredients-section">
                <h3>Ingredients</h3>
                <ul className="ingredients-list">
                  {recipe?.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>
              
              <div className="instructions-section">
                <h3>Instructions</h3>
                <ol className="instructions-list">
                  {recipe?.instructions.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        ) : (
          <div className="flashcard-container">
            {renderFlashcardContent()}
            
            <div className="flashcard-navigation">
              <button 
                className="flashcard-nav-button"
                onClick={() => navigateFlashcard('prev')}
              >
                Previous
              </button>
              <span className="flashcard-counter">
                Card {currentCard + 1} of {(recipe?.ingredients?.length || 0) + (recipe?.instructions?.length || 0) + 1}
              </span>
              <button 
                className="flashcard-nav-button"
                onClick={() => navigateFlashcard('next')}
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        <div className="voice-commands">
          <p>Voice commands:</p>
          <ul>
            <li>"Show me a recipe for [food]"</li>
            <li>"How do I make [dish]"</li>
            <li>"Close recipe"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RecipeDisplay; 