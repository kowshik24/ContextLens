import React, { useState, useRef } from 'react';
import { UserProfile, AppMode } from '../types';
import { MODES } from '../constants';
import { analyzeImageAndQuery } from '../services/geminiService';
import { Camera, Mic, Send, Volume2, VolumeX, AlertCircle, Loader2, User } from 'lucide-react';

interface MainAssistantProps {
  profile: UserProfile;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  onEditProfile: () => void;
}

const MainAssistant: React.FC<MainAssistantProps> = ({ 
  profile, 
  speak, 
  stopSpeaking, 
  isSpeaking,
  onEditProfile 
}) => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SHOPPING);
  const [image, setImage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (mode: AppMode) => {
    setCurrentMode(mode);
    speak(`Switched to ${mode} mode`);
    setResponse(null); // Clear previous response on mode switch
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      speak("Image captured. You can now ask a question or press analyze.");
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceInput = () => {
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
      };

      recognition.onerror = () => {
        setIsListening(false);
        speak("I didn't catch that. Please try again.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      speak("Voice input is not supported in this browser.");
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      speak("Please capture or upload an image first.");
      return;
    }

    setIsLoading(true);
    setResponse(null);
    speak("Analyzing image. Please wait.");

    const result = await analyzeImageAndQuery(image, query, currentMode, profile);
    
    setResponse(result);
    setIsLoading(false);
    speak(result);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-zinc-950 text-yellow-100 overflow-hidden">
      
      {/* Header / Mode Selector */}
      <header className="flex items-center gap-2 p-3 md:p-4 border-b-2 border-zinc-700 bg-zinc-900 sticky top-0 z-10 flex-shrink-0 shadow-md">
        <div 
          className="flex-1 flex overflow-x-auto gap-3 pb-1 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']" 
          role="tablist" 
          aria-label="Assistant Modes"
        >
          {MODES.map((mode) => (
            <button
              key={mode.id}
              role="tab"
              aria-selected={currentMode === mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={`
                flex-shrink-0 flex items-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-xl text-lg md:text-xl font-bold border-2 transition-all whitespace-nowrap
                ${currentMode === mode.id 
                  ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                  : 'bg-zinc-800 text-zinc-300 border-zinc-600 hover:border-zinc-400'}
              `}
            >
              <span className="text-xl md:text-2xl" aria-hidden="true">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
        
        {/* Edit Profile Button Integrated in Header */}
        <button
          onClick={onEditProfile}
          className="flex-shrink-0 p-3 md:p-4 bg-zinc-800 text-yellow-400 rounded-xl border-2 border-yellow-600 hover:bg-zinc-700 focus:bg-zinc-700 active:bg-zinc-600 transition-colors"
          aria-label="Edit Profile"
        >
          <User size={24} className="md:w-8 md:h-8" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 w-full max-w-5xl mx-auto">
        
        {/* Camera / Image Area */}
        <section aria-label="Image Capture" className="w-full">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
            id="camera-input"
          />
          
          {!image ? (
            <label
              htmlFor="camera-input"
              className="flex flex-col items-center justify-center w-full h-48 md:h-72 border-4 border-dashed border-yellow-600 rounded-3xl bg-zinc-900 hover:bg-zinc-800 cursor-pointer transition-colors active:bg-zinc-800"
              role="button"
              aria-label="Tap to capture image"
            >
              <Camera size={48} className="text-yellow-500 mb-3 md:w-16 md:h-16" />
              <span className="text-xl md:text-2xl font-bold text-yellow-200 text-center px-4">Tap to Capture Image</span>
              <span className="text-base md:text-lg text-zinc-400 mt-2">or select from gallery</span>
            </label>
          ) : (
            <div className="relative w-full rounded-3xl overflow-hidden border-4 border-yellow-600 bg-black">
              <img src={image} alt="Captured content" className="w-full h-auto max-h-[40vh] object-contain mx-auto" />
              <button
                onClick={() => {
                  setImage(null);
                  setResponse(null);
                  speak("Image cleared.");
                }}
                className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/80 text-white p-2 md:p-3 rounded-full border-2 border-white hover:bg-black"
                aria-label="Retake photo"
              >
                Retake
              </button>
            </div>
          )}
        </section>

        {/* Input Controls */}
        <section className="space-y-4" aria-label="Question Input">
          <div className="flex gap-2">
            <button
              onClick={handleVoiceInput}
              disabled={isListening}
              className={`
                p-3 md:p-4 rounded-xl border-2 transition-colors flex-shrink-0
                ${isListening ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-zinc-800 border-yellow-600 hover:bg-zinc-700'}
              `}
              aria-label="Voice Input"
            >
              <Mic size={28} className="text-white md:w-8 md:h-8" />
            </button>
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={currentMode === AppMode.SHOPPING ? "Is this safe?" : "Summarize this"}
              className="flex-1 bg-zinc-800 border-2 border-zinc-600 rounded-xl px-4 py-3 text-lg md:text-xl text-white placeholder-zinc-500 focus:border-yellow-500 min-w-0"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!image || isLoading}
            className={`
              w-full py-4 md:py-5 rounded-xl text-xl md:text-2xl font-bold shadow-lg flex items-center justify-center gap-3 transition-transform
              ${!image || isLoading 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-2 border-zinc-700' 
                : 'bg-yellow-500 text-black border-2 border-yellow-400 hover:bg-yellow-400 active:scale-[0.98]'}
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={28} />
                Processing...
              </>
            ) : (
              <>
                <Send size={28} />
                Analyze Image
              </>
            )}
          </button>
        </section>

        {/* Response Area */}
        {response && (
          <section 
            className="bg-zinc-900 border-2 border-yellow-200 rounded-2xl p-4 md:p-6 mt-6 shadow-xl mb-12 scroll-mt-24"
            aria-live="polite"
            id="response-area"
          >
            <div className="flex justify-between items-start mb-4 border-b border-zinc-700 pb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 flex items-center gap-2">
                <AlertCircle className="text-yellow-400 flex-shrink-0" size={28} />
                Assistant Says:
              </h2>
              <button
                onClick={() => isSpeaking ? stopSpeaking() : speak(response)}
                className="p-2 md:p-3 bg-zinc-800 rounded-full border border-zinc-600 hover:bg-zinc-700 flex-shrink-0"
                aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
              >
                {isSpeaking ? <VolumeX size={28} /> : <Volume2 size={28} />}
              </button>
            </div>
            <div className="prose prose-invert prose-lg md:prose-xl max-w-none text-yellow-50 leading-relaxed whitespace-pre-wrap font-medium">
              {response}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default MainAssistant;