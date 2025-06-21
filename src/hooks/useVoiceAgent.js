// Voice Agent Hook - Continuous listening with LLM intent detection
import { useState, useEffect, useRef, useCallback } from 'react';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_KEY,
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

export function useVoiceAgent() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, responding
  const [lastTranscript, setLastTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [generatedUI, setGeneratedUI] = useState(null); // New state for dynamic UI
  const audioRef = useRef(null);

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

      mediaRecorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);

      const audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
          console.log('🎵 Audio blob created, size:', audioBlob.size);
          await processAudioWithLLM(audioBlob);
        }
        
        // Restart listening after processing
        if (isListening && !isProcessing) {
          setTimeout(() => {
            if (isListening) {
              startNextChunk();
            }
          }, 100);
        }
      };

      // Start voice activity detection loop
      startVoiceActivityDetection();
      
    } catch (error) {
      console.error('❌ Error starting voice listening:', error);
      setStatus('idle');
      isListening = false;
      setIsActive(false);
    }
  }, []);

  // Voice activity detection with improved sensitivity
  const startVoiceActivityDetection = () => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart = Date.now();
    let voiceDetected = false;
    let recordingChunk = false;

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
      const VOICE_THRESHOLD = 25;
      const SILENCE_DURATION = 1500; // 1.5 seconds of silence
      const MIN_VOICE_DURATION = 300; // Minimum 300ms of voice
      
      if (average > VOICE_THRESHOLD) {
        if (!voiceDetected) {
          voiceDetected = true;
          console.log('👄 Voice detected, starting recording...');
          startRecordingChunk();
          recordingChunk = true;
        }
        silenceStart = Date.now();
      } else {
        // Check for end of speech
        if (voiceDetected && Date.now() - silenceStart > SILENCE_DURATION) {
          if (recordingChunk && mediaRecorder && mediaRecorder.state === 'recording') {
            console.log('🔇 Silence detected, stopping recording...');
            mediaRecorder.stop();
            recordingChunk = false;
          }
          voiceDetected = false;
        }
      }

      requestAnimationFrame(detectVoice);
    };

    detectVoice();
  };

  // Start recording a new chunk
  const startRecordingChunk = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive' && !isProcessing) {
      console.log('🟢 Started recording chunk');
      try {
        mediaRecorder.start(100); // Collect data every 100ms
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  // Start next chunk for continuous listening
  const startNextChunk = () => {
    if (isListening && !isProcessing && mediaRecorder) {
      // Small delay to prevent overlapping
      setTimeout(() => {
        if (isListening && !isProcessing) {
          console.log('🔄 Ready for next voice input...');
        }
      }, 200);
    }
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
          setGeneratedUI(intentData.uiType);
          await generateAndSpeakUI(intentData.uiType, intentData.specificUI);
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

  // Generate and speak UI
  const generateAndSpeakUI = async (uiType, specificUI) => {
    try {
      console.log(`🎨 Generating UI: ${uiType} - ${specificUI}`);
      
      // Set the UI component based on the specific request
      if (specificUI === 'wordle' || (uiType === 'game' && (specificUI === 'wordle' || !specificUI))) {
        setGeneratedUI('wordle');
        await speakResponse("Perfect! I'm opening Wordle for you. It's a word guessing game where you try to guess a 5-letter word in 6 attempts. Use your keyboard to type letters and press Enter to submit your guess. Good luck!");
      } else if (uiType === 'game') {
        // Default to wordle for any game request
        setGeneratedUI('wordle');
        await speakResponse(`Starting a word game for you! Try to guess the 5-letter word using your keyboard.`);
      } else {
        // For other UI types, we can expand later
        setGeneratedUI('wordle'); // Default to wordle for now
        await speakResponse(`I'm opening ${specificUI || 'a game'} for you! Let me know if you need help.`);
      }
      
    } catch (error) {
      console.error('Error generating UI:', error);
      await speakResponse("I'm sorry, I encountered an error generating the UI. Please try again.");
    }
  };

  // Speak response using OpenAI TTS
  const speakResponse = async (text) => {
    try {
      console.log('Speaking:', text);
      
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        speed: 1.0
      });

      const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      
      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.play().catch(console.error);
      });
      
    } catch (error) {
      console.error('Error speaking response:', error);
      // Fallback to speech synthesis
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = resolve;
        utterance.onerror = resolve;
        speechSynthesis.speak(utterance);
      });
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

  return {
    isActive,
    status,
    lastTranscript,
    confidence,
    generatedUI,
    toggleListening,
    startListening,
    stopListening,
    closeUI
  };
}
