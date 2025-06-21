// Intent routing - can be local or remote
export async function routeIntent(text) {
  const normalizedText = text.toLowerCase().trim();
  
  console.log('Routing intent for:', normalizedText);

  // Local intent matching (for development/fallback)
  const localIntent = matchLocalIntent(normalizedText);
  if (localIntent) {
    return localIntent;
  }

  // Try Cloudflare Worker if configured
  if (import.meta.env.VITE_CF_INTENT_URL) {
    try {
      const response = await fetch(import.meta.env.VITE_CF_INTENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: normalizedText }),
      });
      
      if (response.ok) {
        const intent = await response.json();
        console.log('Remote intent:', intent);
        return intent;
      }
    } catch (error) {
      console.warn('Remote intent routing failed, using local:', error);
    }
  }

  // Fallback to local matching
  return matchLocalIntent(normalizedText) || { module: null, params: {} };
}

function matchLocalIntent(text) {
  // Wordle keywords
  if (text.includes('wordle') || text.includes('word game') || text.includes('play game') || text.includes('puzzle')) {
    return { module: 'wordle', params: {} };
  }

  // Weather keywords  
  if (text.includes('weather') || text.includes('temperature') || text.includes('forecast') || text.includes('climate')) {
    return { module: 'weather', params: {} };
  }

  // Letter guessing for Wordle (when in game)
  if (/^[a-z]{5}$/i.test(text.replace(/\s/g, ''))) {
    return { module: 'wordle', params: { guess: text.replace(/\s/g, '') } };
  }

  // Single letters for Wordle
  if (/^[a-z]$/i.test(text)) {
    return { module: 'wordle', params: { letter: text } };
  }

  return null;
}

// Mock Cloudflare Worker response for testing
export function createMockWorkerResponse(text) {
  const intent = matchLocalIntent(text.toLowerCase());
  return Promise.resolve(intent || { module: null, params: {} });
}
