import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, AppMode, ChatMessage } from '../types';
import { MODES } from '../constants';
import { analyzeImageAndQuery } from '../services/geminiService';
import { Camera, Mic, Send, Volume2, VolumeX, Loader2, User, ScanLine, Sparkles, AlertTriangle, Trash2, ArrowUp, ImageIcon } from 'lucide-react';

interface MainAssistantProps {
  profile: UserProfile;
  speak: (text: string, force?: boolean) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  onEditProfile: () => void;
  voiceEnabled: boolean;
  toggleVoice: () => void;
}

const MainAssistant: React.FC<MainAssistantProps> = ({ 
  profile, 
  speak, 
  stopSpeaking, 
  isSpeaking,
  onEditProfile,
  voiceEnabled,
  toggleVoice
}) => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SHOPPING);
  
  // Per-mode state storage to keep histories and contexts separate
  const [modeState, setModeState] = useState<Record<AppMode, { history: ChatMessage[], activeImage: string | null }>>({
    [AppMode.SHOPPING]: { history: [], activeImage: null },
    [AppMode.APPLIANCE]: { history: [], activeImage: null },
    [AppMode.DOCUMENT]: { history: [], activeImage: null },
  });
  
  // Derived state for the active view based on currentMode
  const history = modeState[currentMode].history;
  const activeImage = modeState[currentMode].activeImage;
  
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message or mode switch
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading, currentMode]);

  // Haptic Feedback Helper
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleModeChange = (mode: AppMode) => {
    vibrate(50);
    setCurrentMode(mode);
    speak(`${mode} mode`);
    // Note: We no longer inject "Switched to..." messages into history
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      vibrate([50, 50, 50]); // Triple tap confirmation
      speak("Image captured.");
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        
        // Update ONLY current mode's image
        setModeState(prev => ({
          ...prev,
          [currentMode]: {
            ...prev[currentMode],
            activeImage: result
          }
        }));
        
        // Automatically trigger analysis for the new image in the current mode
        handleSubmit(undefined, result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearActiveImage = () => {
      vibrate(50);
      setModeState(prev => ({
          ...prev,
          [currentMode]: {
              ...prev[currentMode],
              activeImage: null
          }
      }));
  };

  const handleVoiceInput = () => {
    vibrate(50);
    // Basic Speech Recognition wrapper
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        speak("Listening...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        speak(`I heard: ${transcript}`);
        setIsListening(false);
        vibrate(50);
      };

      recognition.onerror = () => {
        setIsListening(false);
        speak("I didn't catch that. Please try again.");
        vibrate([50, 100, 50]); // Error vibration
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      speak("Voice input is not supported in this browser.");
    }
  };

  const handleSubmit = async (overrideQuery?: string, overrideImage?: string) => {
    // Capture the mode at the start of the request to ensure response goes to correct history
    // even if user switches tabs while waiting
    const requestMode = currentMode;
    
    // Determine inputs based on the requested mode's state (or overrides)
    const textToSubmit = overrideQuery || query;
    const imageToUse = overrideImage || modeState[requestMode].activeImage;

    // Validation: Need either text or an image
    if (!imageToUse && !textToSubmit.trim()) {
      speak("Please capture an image or ask a question.");
      vibrate([50, 100, 50]);
      return;
    }

    vibrate(50);
    setIsLoading(true);
    setQuery(''); // Clear global input

    // 1. Add User Message to specific mode history
    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: textToSubmit || (imageToUse && !textToSubmit ? "Analyze this image" : "Analyze"),
      timestamp: Date.now(),
      // Only attach image to history if it's a NEW upload or explicitly sent
      image: overrideImage ? overrideImage : undefined
    };
    
    setModeState(prev => ({
        ...prev,
        [requestMode]: {
            ...prev[requestMode],
            history: [...prev[requestMode].history, newUserMsg]
        }
    }));

    // Speak status
    if (voiceEnabled) speak("Thinking...");

    // 2. Call API
    // Get history specifically for the request mode to provide context
    const currentHistory = modeState[requestMode].history; 
    const recentContext = currentHistory.slice(-3).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
    
    const rawResult = await analyzeImageAndQuery(
      imageToUse, 
      textToSubmit, 
      requestMode, 
      profile,
      recentContext
    );
    
    // 3. Parse Result
    const parts = rawResult.split('|||');
    const mainResponse = parts[0].trim();
    let extractedSuggestions: string[] = [];

    if (parts.length > 1) {
      extractedSuggestions = parts[1]
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Check for hazards
    const hasHazard = mainResponse.includes("WARNING") || mainResponse.includes("Alert");
    if (hasHazard) {
      vibrate([100, 50, 100, 50, 500]); // Long warning vibration
    } else {
      vibrate([100, 50]); // Success vibration
    }

    // 4. Add Assistant Message to specific mode history
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: mainResponse,
      timestamp: Date.now(),
      isHazard: hasHazard,
      suggestions: extractedSuggestions
    };

    setModeState(prev => ({
        ...prev,
        [requestMode]: {
            ...prev[requestMode],
            history: [...prev[requestMode].history, assistantMsg]
        }
    }));

    setIsLoading(false);
    
    // Read response
    speak(mainResponse);
  };

  const getPlaceholderText = () => {
    if (activeImage) return "Ask about the image...";
    if (currentMode === AppMode.SHOPPING) return "Ask about diet or products...";
    return "Type a message...";
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-zinc-950 text-yellow-100 overflow-hidden">
      
      {/* 1. Header & Mode Selector */}
      <header className="flex flex-col border-b-2 border-zinc-800 bg-zinc-900 sticky top-0 z-20 shadow-md">
        <div className="flex items-center justify-between p-3 md:p-4">
          <div className="flex items-center gap-2">
             <button
              onClick={() => { onEditProfile(); vibrate(50); }}
              className="p-2 bg-zinc-800 text-yellow-500 rounded-full border border-yellow-600/50"
              aria-label="Profile"
            >
              <User size={20} />
            </button>
            <h1 className="text-xl font-bold text-yellow-500 tracking-tight">{currentMode}</h1>
          </div>

          <div className="flex items-center gap-2">
             <button
              onClick={() => { toggleVoice(); vibrate(50); }}
              className={`
                p-2 rounded-full border transition-colors
                ${voiceEnabled ? 'bg-yellow-500 text-black border-yellow-600' : 'bg-zinc-800 text-zinc-400 border-zinc-600'}
              `}
              aria-label="Toggle Voice"
            >
              {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div 
          className="flex overflow-x-auto px-2 pb-2 gap-2 no-scrollbar" 
          role="tablist"
        >
          {MODES.map((mode) => (
            <button
              key={mode.id}
              role="tab"
              aria-selected={currentMode === mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={`
                flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all whitespace-nowrap
                ${currentMode === mode.id 
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500' 
                  : 'bg-zinc-800 text-zinc-400 border-transparent'}
              `}
            >
              <span>{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Active Context (Image Pinned - Mode Specific) */}
      {activeImage && (
        <div className="bg-zinc-900/50 border-b border-zinc-800 p-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-yellow-500/50 flex-shrink-0">
               <img src={activeImage} alt="Context" className="h-full w-full object-cover" />
            </div>
            <span className="text-xs text-zinc-400 font-medium truncate">Analyzing active image...</span>
          </div>
          <button 
            onClick={clearActiveImage}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
            aria-label="Clear Image Context"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}

      {/* 3. Chat Feed (Scrollable - Mode Specific) */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 w-full max-w-5xl mx-auto custom-scrollbar">
        {history.length === 0 && !activeImage && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-60 mt-10">
            <ScanLine size={64} className="mb-4 text-yellow-900" />
            <p className="text-center text-lg">Select a mode, capture an image,<br/>or ask a question to begin.</p>
          </div>
        )}

        {history.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}
          >
            {/* Message Bubble */}
            <div 
              className={`
                max-w-[90%] md:max-w-[80%] rounded-2xl p-4 md:p-5 text-lg md:text-xl font-medium shadow-md leading-relaxed whitespace-pre-wrap
                ${msg.role === 'user' 
                  ? 'bg-zinc-800 text-white rounded-br-none border border-zinc-700' 
                  : msg.isHazard 
                    ? 'bg-red-950/80 text-red-100 border-2 border-red-500 rounded-bl-none shadow-[0_0_20px_rgba(220,38,38,0.2)]' 
                    : 'bg-yellow-500/10 text-yellow-100 border border-yellow-500/30 rounded-bl-none'}
              `}
            >
              {msg.isHazard && (
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2 uppercase tracking-wider text-sm">
                  <AlertTriangle size={18} className="animate-pulse" />
                  Safety Warning
                </div>
              )}
              
              {/* If message has an image snapshot (e.g. initial upload) */}
              {msg.image && (
                 <img src={msg.image} alt="Upload" className="w-full h-32 object-cover rounded-lg mb-3 border border-zinc-600 opacity-80" />
              )}
              
              {msg.text}
            </div>

            {/* Smart Suggestions Chips (Only for model messages) */}
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in zoom-in duration-500 delay-100">
                {msg.suggestions.map((s, idx) => (
                  <button
                    key={`${msg.id}-sug-${idx}`}
                    onClick={() => handleSubmit(s)}
                    className="
                      flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:bg-yellow-500/20 
                      border border-yellow-600/30 text-yellow-200/90 
                      px-4 py-2 rounded-full text-base font-medium transition-all active:scale-95
                    "
                  >
                    <Sparkles size={14} className="text-yellow-500" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
             <div className="bg-zinc-900 border border-yellow-500/20 rounded-2xl rounded-bl-none p-4 flex items-center gap-3 text-yellow-500">
                <Loader2 size={24} className="animate-spin" />
                <span className="font-medium animate-pulse">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* 4. Bottom Input Area */}
      <section className="p-3 md:p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          
          <div className="flex gap-2 items-end">
            {/* Camera Button */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              id="camera-input"
            />
            <label
              htmlFor="camera-input"
              className="p-3 mb-[2px] rounded-xl bg-zinc-800 border border-zinc-600 text-yellow-500 hover:bg-zinc-700 active:scale-95 cursor-pointer transition-colors"
              onClick={() => vibrate(50)}
              aria-label="Take Photo"
            >
              {activeImage ? <ImageIcon size={24} /> : <Camera size={24} />}
            </label>

            {/* Voice Input */}
            <button
              onClick={handleVoiceInput}
              disabled={isListening}
              className={`
                p-3 mb-[2px] rounded-xl border transition-colors flex-shrink-0 active:scale-95
                ${isListening 
                  ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' 
                  : 'bg-zinc-800 border-zinc-600 text-yellow-500 hover:bg-zinc-700'}
              `}
              aria-label="Voice Input"
            >
              <Mic size={24} />
            </button>
            
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={getPlaceholderText()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 py-3 text-lg text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none min-h-[54px] max-h-[120px] resize-none"
                rows={1}
              />
            </div>

            {/* Send Button */}
             <button
              onClick={() => handleSubmit()}
              disabled={(!activeImage && !query.trim()) || isLoading}
              className={`
                p-3 mb-[2px] rounded-xl font-bold shadow-lg transition-all active:scale-95
                ${(!activeImage && !query.trim()) || isLoading 
                  ? 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed' 
                  : 'bg-yellow-500 text-black border border-yellow-400 hover:bg-yellow-400'}
              `}
              aria-label="Send Message"
            >
              <ArrowUp size={28} strokeWidth={3} />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default MainAssistant;