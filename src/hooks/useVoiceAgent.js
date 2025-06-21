// Voice Agent Hook - Continuous listening with LLM intent detection
import { useState, useEffect, useRef, useCallback } from 'react';
import OpenAI from 'openai';
import { findModuleByCommand, getAllModules } from '../modules/moduleRegistry';

const openAIKey = import.meta.env.VITE_OPENAI_KEY;

const openai = new OpenAI({
  apiKey: openAIKey,
  dangerouslyAllowBrowser: true
});

// Global state for voice agent
let isListening = false;
let mediaRecorder = null;
let audioStream = null;
let silenceTimer = null;
let audioContext = null;
let analyser = null;
let isProcessing = false;

// Direct command handler for testing and debugging
const handleDirectCommand = (command) => {
  console.log(`Handling direct command: ${command}`);
  
  // Check for module activation commands
  if (command.includes('pomodoro') || command.includes('timer')) {
    return 'pomodoro';
  }
  
  // Recipe commands with special handling
  if (command.includes('recipe') || command.includes('food') || command.includes('how to make') || command.includes('how to cook')) {
    // Try to extract the specific recipe query
    const recipeMatch = command.match(/recipe for (.*)/i) || 
                       command.match(/how (do I|to) (make|cook) (.*)/i) ||
                       command.match(/show me (a|how to make) (.*)/i) ||
                       command.match(/find (a|me) (.*) recipe/i);
    
    if (recipeMatch) {
      const food = recipeMatch[recipeMatch.length - 1].trim();
      console.log(`Extracted recipe query: "${food}"`);
      
      // Add the recipe query to URL parameters
      const url = new URL(window.location.href);
      url.searchParams.set('recipe', food);
      window.history.replaceState({}, '', url);
    }
    
    return 'recipe';
  }
  
  if (command.includes('flight') || command.includes('track flight')) {
    return 'flight';
  }
  
  if (command.includes('wordle') || command.includes('word game')) {
    return 'wordle';
  }
  
  if (command.includes('weather') || command.includes('forecast')) {
    return 'weather';
  }
  
  return null;
};

export function useVoiceAgent() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, responding
  const [lastTranscript, setLastTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [generatedUI, setGeneratedUI] = useState(null); // New state for dynamic UI
  const [isSpeaking, setIsSpeaking] = useState(false); // New state for speaking status
  const audioRef = useRef(null);
  const currentAudio = useRef(null);

  // Initialize audio context for user interaction requirement
  const initializeAudio = useCallback(async () => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Create a silent audio to satisfy user interaction requirement
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBSuBzvLZiTYIG2m98OScTgwOUarm7blmHgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        audioRef.current.volume = 0.01;
        audioRef.current.loop = false;
      }
      
      await audioRef.current.play();
      console.log('Audio context initialized');
      return true;
    } catch (error) {
      console.warn('Could not initialize audio context:', error);
      return false;
    }
  }, []);

  // Start continuous listening
  const startListening = useCallback(async () => {
    if (isListening) return;
    
    try {
      console.log('🎤 Starting continuous voice listening...');
      isListening = true;
      setIsActive(true);
      setStatus('listening');

      // Request microphone access
      audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });

      // Set up audio analysis for voice activity detection
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const source = audioContext.createMediaStreamSource(audioStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      // Try different MIME types for better compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }
      
      console.log('Using MIME type:', mimeType);

      // Start voice activity detection loop
      startVoiceActivityDetection(mimeType);
      
    } catch (error) {
      console.error('❌ Error starting voice listening:', error);
      setStatus('idle');
      isListening = false;
      setIsActive(false);
    }
  }, []);

  // Voice activity detection with improved sensitivity and proper chunk management
  const startVoiceActivityDetection = (mimeType) => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart = Date.now();
    let voiceDetected = false;
    let currentRecorder = null;
    let currentAudioChunks = [];

    const detectVoice = () => {
      if (!isListening || isProcessing) {
        requestAnimationFrame(detectVoice);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Voice detection threshold (adjusted for better sensitivity)
      const VOICE_THRESHOLD = 30;
      const SILENCE_DURATION = 2000; // 2 seconds of silence
      const MIN_RECORDING_DURATION = 500; // Minimum 500ms recording
      
      if (average > VOICE_THRESHOLD) {
        if (!voiceDetected) {
          voiceDetected = true;
          console.log('👄 Voice detected, starting new recording...');
          
          // Create a new MediaRecorder for this chunk
          currentAudioChunks = []; // Reset chunks
          currentRecorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
          
          currentRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              currentAudioChunks.push(event.data);
            }
          };

          currentRecorder.onstop = async () => {
            if (currentAudioChunks.length > 0) {
              const audioBlob = new Blob(currentAudioChunks, { type: mimeType || 'audio/webm' });
              console.log('🎵 Audio chunk completed, size:', audioBlob.size);
              
              // Only process if we have meaningful audio
              if (audioBlob.size > 1000) { // At least 1KB of audio
                await processAudioWithLLM(audioBlob);
              }
            }
            // Clear the recorder reference
            currentRecorder = null;
            currentAudioChunks = [];
          };
          
          try {
            currentRecorder.start(100); // Collect data every 100ms
            console.log('🟢 Started recording new chunk');
          } catch (error) {
            console.error('Error starting recording:', error);
          }
        }
        silenceStart = Date.now();
      } else {
        // Check for end of speech
        if (voiceDetected && Date.now() - silenceStart > SILENCE_DURATION) {
          if (currentRecorder && currentRecorder.state === 'recording') {
            console.log('🔇 Silence detected, stopping recording...');
            currentRecorder.stop();
          }
          voiceDetected = false;
        }
      }

      requestAnimationFrame(detectVoice);
    };

    detectVoice();
  };

  // Process audio with LLM for intent detection
  const processAudioWithLLM = async (audioBlob) => {
    if (isProcessing) return;
    
    try {
      isProcessing = true;
      setStatus('processing');
      console.log('Processing audio for intent detection...');

      // Check if we have valid audio data
      if (!audioBlob || audioBlob.size === 0) {
        console.log('No audio data to process');
        isProcessing = false;
        setStatus('listening');
        return;
      }

      console.log('Audio blob size:', audioBlob.size, 'bytes');

      // Transcribe with Whisper
      // Convert blob to File object for OpenAI API
      const fileExtension = audioBlob.type.includes('webm') ? 'webm' : 
                           audioBlob.type.includes('mp4') ? 'mp4' : 'wav';
      const audioFile = new File([audioBlob], `audio.${fileExtension}`, { type: audioBlob.type });

      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en'
      });

      const transcript = transcriptionResponse.text?.trim();
      console.log('Transcript:', transcript);
      
      if (!transcript || transcript.length < 2) {
        console.log('No meaningful speech detected');
        isProcessing = false;
        setStatus('listening');
        return;
      }

      setLastTranscript(transcript);
      
      // Direct command handling for faster response (bypass LLM for obvious commands)
      const directModule = handleDirectCommand(transcript.toLowerCase());
      if (directModule) {
        console.log(`Direct module activation: ${directModule}`);
        setGeneratedUI(directModule);
        
        // Speak confirmation
        const confirmations = {
          'pomodoro': "Starting your pomodoro timer. You can control it using voice commands.",
          'recipe': "Here's the recipe you asked for. You can ask for specific recipes using voice commands.",
          'flight': "Opening the flight tracker. You can track specific flights using voice commands.",
          'wordle': "Let's play Wordle. Try guessing the five letter word.",
          'weather': "Here's the weather information you requested."
        };
        
        await speakResponse(confirmations[directModule] || `Opening ${directModule}.`);
        isProcessing = false;
        setStatus('listening');
        return;
      }

      // Use LLM to detect if this is a real request/command
      const intentResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an intent detection system for a generative UI assistant. Analyze the user's speech and determine:

1. If it's a genuine request/command that requires a response
2. If it's a UI generation request (games, apps, tools, widgets)

Return a JSON object with:
- "isRequest": boolean (true if this is a genuine request/command)
- "confidence": number 0-1 (how confident you are)
- "intent": string (brief description of what they want)
- "shouldRespond": boolean (true if the assistant should respond)
- "uiType": string or null (type of UI to generate: "game", "app", "widget", "tool", null)
- "specificUI": string or null (specific UI component: "wordle", "calculator", "timer", etc.)

Examples of UI generation requests:
- "Let's play word game" -> {"uiType": "game", "specificUI": "wordle"}
- "Play wordle" -> {"uiType": "game", "specificUI": "wordle"}
- "Start a game" -> {"uiType": "game", "specificUI": "wordle"}
- "Open calculator" -> {"uiType": "tool", "specificUI": "calculator"}
- "Show me a timer" -> {"uiType": "widget", "specificUI": "timer"}
- "Let's play a game" -> {"uiType": "game", "specificUI": "wordle"}

Examples of regular requests:
- "What's the weather like?" -> {"uiType": null, "specificUI": null}
- "Tell me a joke" -> {"uiType": null, "specificUI": null}
- "Help me with something" -> {"uiType": null, "specificUI": null}

Examples of NOT genuine requests:
- "Hey" (just greeting, no request)
- "Um, let me think"
- "Hmm"
- Random background conversation`
          },
          {
            role: 'user',
            content: `Analyze this speech: "${transcript}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      let intentData;
      try {
        intentData = JSON.parse(intentResponse.choices[0].message.content);
      } catch (e) {
        console.error('Failed to parse intent response:', e);
        isProcessing = false;
        setStatus('listening');
        return;
      }

      console.log('Intent analysis:', intentData);
      setConfidence(intentData.confidence || 0);

      // If it's a genuine request, respond
      if (intentData.isRequest && intentData.shouldRespond && intentData.confidence > 0.6) {
        console.log('🎯 Genuine request detected:', intentData.intent);
        setStatus('responding');
        
        // Say "Responding" first
        await speakResponse("Responding");
        
        // Generate and speak the actual response
        if (intentData.uiType) {
          await generateAndSpeakUI(transcript, intentData.uiType, intentData.specificUI);
        } else {
          await generateAndSpeakResponse(transcript, intentData.intent);
        }
      } else {
        console.log('Not a genuine request, continuing to listen...');
      }

    } catch (error) {
      console.error('Error processing audio:', error);
      
      // Fallback to Web Speech API for transcription
      console.log('Falling back to Web Speech API for transcription...');
      try {
        await processAudioWithWebSpeechAPI(audioBlob);
      } catch (fallbackError) {
        console.error('Web Speech API fallback also failed:', fallbackError);
        await speakResponse("I'm sorry, I had trouble understanding that. Please try again.");
      }
    } finally {
      isProcessing = false;
      setStatus('listening');
    }
  };

  // Fallback to Web Speech API for transcription
  const processAudioWithWebSpeechAPI = async (audioBlob) => {
    return new Promise((resolve, reject) => {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log('Web Speech API transcript:', transcript);
        
        if (transcript && transcript.length > 2) {
          setLastTranscript(transcript);
          
          // Simple intent detection for fallback
          const shouldRespond = transcript.includes('?') || 
                               transcript.toLowerCase().includes('tell me') ||
                               transcript.toLowerCase().includes('what') ||
                               transcript.toLowerCase().includes('how') ||
                               transcript.toLowerCase().includes('help');
          
          if (shouldRespond) {
            setStatus('responding');
            await speakResponse("Let me help you with that.");
            await generateAndSpeakResponse(transcript, "general request");
          }
        }
        resolve();
      };

      recognition.onerror = (event) => {
        console.error('Web Speech API error:', event.error);
        reject(new Error(`Speech recognition failed: ${event.error}`));
      };

      recognition.onend = () => {
        resolve();
      };

      // Convert blob to audio URL for Web Speech API
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onloadeddata = () => {
        recognition.start();
        audio.play().catch(console.error);
      };
      
      audio.onerror = () => {
        reject(new Error('Failed to load audio for Web Speech API'));
      };
    });
  };

  // Generate response using LLM
  const generateAndSpeakResponse = async (transcript, intent) => {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are PhantomUI, a helpful voice assistant. Provide concise, natural responses to user requests. Keep responses under 50 words unless more detail is specifically requested.`
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      const responseText = response.choices[0].message.content;
      console.log('Generated response:', responseText);
      
      await speakResponse(responseText);
      
    } catch (error) {
      console.error('Error generating response:', error);
      await speakResponse("I'm sorry, I encountered an error processing your request.");
    }
  };

  // Generate and speak UI using module registry
  const generateAndSpeakUI = async (originalCommand, uiType, specificUI) => {
    try {
      console.log(`🎨 Generating UI for: "${originalCommand}" (type: ${uiType}, specific: ${specificUI})`);
      
      // Check if there's a direct module match from the registry
      const moduleMatch = findModuleByCommand(originalCommand);
      
      if (moduleMatch) {
        console.log(`Found module match: ${moduleMatch.moduleId}`);
        setGeneratedUI(moduleMatch.moduleId);
        
        // Speak a confirmation
        const moduleConfirmations = {
          'wordle': "Let's play Wordle. Try guessing the five letter word.",
          'weather': "Here's the weather information you requested.",
          'pomodoro': "Starting your pomodoro timer. You can control it using voice commands.",
          'recipe': "Here's the recipe you asked for.",
          'flight': "Tracking your flight. Here are the details."
        };
        
        const confirmation = moduleConfirmations[moduleMatch.moduleId] || `Opening ${moduleMatch.moduleId}.`;
        await speakResponse(confirmation);
        
        return;
      }
      
      // If we get here, there was no direct module match, so try to infer from intent
      console.log("No direct module match, trying to infer from intent...");
      
      // Check for specific UI types and map them to modules
      if (uiType === 'timer' || specificUI === 'timer' || specificUI === 'pomodoro') {
        console.log("Detected timer/pomodoro request");
        setGeneratedUI('pomodoro');
        await speakResponse("Starting your pomodoro timer. You can control it using voice commands.");
        return;
      }
      
      if (uiType === 'recipe' || specificUI === 'recipe' || specificUI === 'food') {
        console.log("Detected recipe request");
        setGeneratedUI('recipe');
        await speakResponse("Here's the recipe you asked for. You can ask for specific recipes using voice commands.");
        return;
      }
      
      if (uiType === 'flight' || specificUI === 'flight' || specificUI === 'tracker') {
        console.log("Detected flight tracker request");
        setGeneratedUI('flight');
        await speakResponse("Opening the flight tracker. You can track specific flights using voice commands.");
        return;
      }
      
      if (uiType === 'game' || specificUI === 'wordle' || specificUI === 'game') {
        console.log("Detected game/wordle request");
        setGeneratedUI('wordle');
        await speakResponse("Let's play Wordle. Try guessing the five letter word.");
        return;
      }
      
      if (uiType === 'weather' || specificUI === 'weather' || specificUI === 'forecast') {
        console.log("Detected weather request");
        setGeneratedUI('weather');
        await speakResponse("Here's the weather information you requested.");
        return;
      }
      
      // If we still don't have a match, show available modules
      console.log("No specific module detected, showing available options");
      const availableModules = getAllModules();
      const moduleList = availableModules.map(mod => mod.description).join(', ');
      await speakResponse(`I can help you with these: ${moduleList}. What would you like to try?`);
      
    } catch (error) {
      console.error('Error generating UI:', error);
      await speakResponse("I'm sorry, I encountered an error generating the UI. Please try again.");
      setStatus('listening');
    }
  };

  // Improved TTS with OpenAI integration
  const speakResponse = async (text) => {
    if (!text || text.trim() === '') return;
    
    try {
      setStatus('responding');
      setIsSpeaking(true);
      
      // Stop any current speech
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current = null;
      }
      
      console.log('🔊 Speaking:', text);
      
      // Try OpenAI TTS first
      if (openAIKey) {
        try {
          const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'tts-1-hd', // Use high-quality model
              input: text.substring(0, 4000), // Limit text length
              voice: 'nova', // Natural female voice
              response_format: 'mp3',
              speed: 1.0 // Natural speed
            }),
          });

          if (response.ok) {
            const audioData = await response.arrayBuffer();
            const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            currentAudio.current = new Audio(audioUrl);
            
            currentAudio.current.onended = () => {
              setIsSpeaking(false);
              setStatus('listening');
              URL.revokeObjectURL(audioUrl);
              currentAudio.current = null;
            };
            
            currentAudio.current.onerror = (error) => {
              console.error('Audio playback error:', error);
              fallbackToWebSpeech(text);
            };
            
            await currentAudio.current.play();
            console.log('🎵 OpenAI TTS playback started');
            return;
          }
        } catch (error) {
          console.warn('OpenAI TTS failed, falling back to Web Speech:', error);
        }
      }
      
      // Fallback to Web Speech API
      fallbackToWebSpeech(text);
      
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      setIsSpeaking(false);
      setStatus('listening');
    }
  };

  // Web Speech API fallback
  const fallbackToWebSpeech = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a good voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') || 
        voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.9; // Slightly slower
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setStatus('listening');
        console.log('🎵 Web Speech TTS completed');
      };
      
      utterance.onerror = (error) => {
        console.error('Web Speech error:', error);
        setIsSpeaking(false);
        setStatus('listening');
      };
      
      speechSynthesis.speak(utterance);
      console.log('🎵 Web Speech TTS started');
    } else {
      console.warn('Speech synthesis not supported');
      setIsSpeaking(false);
      setStatus('listening');
    }
  };

  // Close generated UI
  const closeUI = () => {
    setGeneratedUI(null);
  };

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('Stopping voice listening...');
    isListening = false;
    isProcessing = false;
    
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    
    setStatus('idle');
  }, []);

  // Toggle listening
  const toggleListening = useCallback(async () => {
    if (isActive) {
      stopListening();
      setIsActive(false);
    } else {
      setIsActive(true);
      await startListening();
    }
  }, [isActive, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Auto-start listening when activated
  useEffect(() => {
    if (isActive && !isListening) {
      startListening();
    }
  }, [isActive, startListening]);

  // Export speakMessage as a public function
  const speakMessage = async (message) => {
    if (!message) return;
    return await speakResponse(message);
  };

  // Listen for debug set-module events
  useEffect(() => {
    const handleSetModule = (event) => {
      if (event.detail && event.detail.moduleId) {
        console.log(`Setting module from debug event: ${event.detail.moduleId}`);
        setGeneratedUI(event.detail.moduleId);
      }
    };
    
    window.addEventListener('set-module', handleSetModule);
    return () => window.removeEventListener('set-module', handleSetModule);
  }, []);

  // Check for module from body attribute on load (for debug persistence)
  useEffect(() => {
    const moduleFromAttr = document.querySelector('body').getAttribute('data-module');
    if (moduleFromAttr) {
      console.log(`Loading module from body attribute: ${moduleFromAttr}`);
      setGeneratedUI(moduleFromAttr);
      document.querySelector('body').removeAttribute('data-module');
    }
  }, []);

  // Listen for simulated voice commands from the debug interface
  useEffect(() => {
    const handleVoiceCommand = (event) => {
      if (!event.detail || !event.detail.transcript) return;
      
      const transcript = event.detail.transcript;
      console.log(`Received simulated voice command: ${transcript}`);
      
      // Set the transcript
      setLastTranscript(transcript);
      
      // Process the command directly
      const directModule = handleDirectCommand(transcript.toLowerCase());
      if (directModule) {
        console.log(`Direct module activation from simulated command: ${directModule}`);
        setGeneratedUI(directModule);
        
        // Speak confirmation
        const confirmations = {
          'pomodoro': "Starting your pomodoro timer. You can control it using voice commands.",
          'recipe': "Here's the recipe you asked for. You can ask for specific recipes using voice commands.",
          'flight': "Opening the flight tracker. You can track specific flights using voice commands.",
          'wordle': "Let's play Wordle. Try guessing the five letter word.",
          'weather': "Here's the weather information you requested."
        };
        
        speakResponse(confirmations[directModule] || `Opening ${directModule}.`);
      } else {
        // Check for identity questions
        if (isIdentityQuestion(transcript)) {
          const responses = [
            "I am Phantom, a voice-first interface designed to help you with minimal visual distractions.",
            "I'm Phantom, your voice assistant. I can help with timers, recipes, games, weather, and tracking flights.",
            "I'm your Phantom interface. I respond primarily to voice commands while keeping visual elements to a minimum."
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          speakResponse(randomResponse);
        }
      }
    };
    
    window.addEventListener('voice-command', handleVoiceCommand);
    return () => window.removeEventListener('voice-command', handleVoiceCommand);
  }, []);

  return {
    isActive,
    status,
    lastTranscript,
    confidence,
    generatedUI,
    isSpeaking,
    toggleListening,
    startListening,
    stopListening,
    closeUI,
    speakMessage
  };
}

export default useVoiceAgent;
