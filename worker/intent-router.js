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
      
      // Letter guessing (5 letters)
      else if (/^[a-z]{5}$/i.test(normalizedText.replace(/\s/g, ''))) {
        intent = { module: 'wordle', params: { guess: normalizedText.replace(/\s/g, '') } };
      }
      
      // Single letter
      else if (/^[a-z]$/i.test(normalizedText)) {
        intent = { module: 'wordle', params: { letter: normalizedText } };
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
