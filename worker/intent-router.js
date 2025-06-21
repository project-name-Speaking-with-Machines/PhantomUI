export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { text } = await request.json();
      const normalizedText = text.toLowerCase().trim();
      
      console.log('Intent routing for:', normalizedText);

      // Enhanced intent matching
      let intent = { module: null, params: {} };

      // Wordle game commands
      if (normalizedText.includes('wordle') || 
          normalizedText.includes('word game') || 
          normalizedText.includes('play game') ||
          normalizedText.includes('puzzle') ||
          normalizedText.includes('guessing game')) {
        intent = { module: 'wordle', params: {} };
      }
      
      // Weather commands
      else if (normalizedText.includes('weather') || 
               normalizedText.includes('temperature') || 
               normalizedText.includes('forecast') ||
               normalizedText.includes('climate') ||
               normalizedText.includes('how hot') ||
               normalizedText.includes('how cold')) {
        intent = { module: 'weather', params: {} };
      }
      
      // Pomodoro timer commands
      else if (normalizedText.includes('pomodoro') || 
               normalizedText.includes('timer') ||
               normalizedText.includes('focus timer') ||
               normalizedText.includes('set timer') ||
               /\b\d+\s*minute(s)?\s*(timer)?\b/.test(normalizedText)) {
        // Extract duration if present
        const durationMatch = normalizedText.match(/\b(\d+)\s*minute(s)?\b/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : null;
        
        intent = { 
          module: 'pomodoro', 
          params: duration ? { minutes: duration } : {} 
        };
      }
      
      // Recipe commands
      else if (normalizedText.includes('recipe') || 
               normalizedText.includes('how to make') ||
               normalizedText.includes('how to cook') ||
               normalizedText.includes('food recipe') ||
               normalizedText.includes('cooking')) {
        // Try to extract the recipe request
        let recipe = null;
        
        const recipeMatches = [
          normalizedText.match(/recipe\s+for\s+(.+)/i),
          normalizedText.match(/how\s+to\s+make\s+(.+)/i),
          normalizedText.match(/how\s+to\s+cook\s+(.+)/i)
        ];
        
        for (const match of recipeMatches) {
          if (match && match[1]) {
            recipe = match[1].trim();
            break;
          }
        }
        
        intent = { 
          module: 'recipe', 
          params: recipe ? { food: recipe } : {} 
        };
      }
      
      // Flight tracker commands
      else if (normalizedText.includes('flight') ||
               normalizedText.includes('track flight') ||
               normalizedText.includes('where is flight') ||
               normalizedText.includes('flight status') ||
               /\b[a-z]{2}\d{1,4}\b/i.test(normalizedText)) { // Airline code + flight number pattern
        
        // Try to extract flight number
        const flightMatch = normalizedText.match(/\b([a-z]{2})(\d{1,4})\b/i);
        let flightNumber = null;
        
        if (flightMatch) {
          const airline = flightMatch[1].toUpperCase();
          const number = flightMatch[2];
          flightNumber = `${airline}${number}`;
        }
        
        intent = { 
          module: 'flight', 
          params: flightNumber ? { flightNumber } : {} 
        };
      }
      
      // Letter guessing (5 letters - for Wordle)
      else if (/^[a-z]{5}$/i.test(normalizedText.replace(/\s/g, ''))) {
        intent = { module: 'wordle', params: { guess: normalizedText.replace(/\s/g, '') } };
      }
      
      // Single letter
      else if (/^[a-z]$/i.test(normalizedText)) {
        intent = { module: 'wordle', params: { letter: normalizedText } };
      }
      
      // Help or identity questions
      else if (normalizedText.includes('who are you') ||
               normalizedText.includes('what are you') ||
               normalizedText.includes('your name') ||
               normalizedText.includes('what can you do') ||
               normalizedText.includes('help me')) {
        intent = { action: 'identity' };
      }

      // Control commands
      else if (normalizedText.includes('stop') || 
               normalizedText.includes('close') || 
               normalizedText.includes('exit') ||
               normalizedText.includes('quit')) {
        intent = { action: 'stop' };
      }

      return new Response(JSON.stringify(intent), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Intent routing error:', error);
      
      return new Response(JSON.stringify({ 
        error: 'Intent routing failed',
        module: null,
        params: {} 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
