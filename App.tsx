import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from './types';
import ProfileSetup from './components/ProfileSetup';
import MainAssistant from './components/MainAssistant';

function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load profile from local storage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('contextLensProfile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }
  }, []);

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('contextLensProfile', JSON.stringify(profile));
  };

  const handleEditProfile = () => {
    setUserProfile(null); // Simple way to go back to edit, clears view not data
  };

  // Text-to-Speech Helper
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Prefer a clear, default voice
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-yellow-500 selection:text-black font-sans">
      {!userProfile ? (
        <ProfileSetup onSave={handleSaveProfile} speak={speak} />
      ) : (
        <MainAssistant 
          profile={userProfile} 
          speak={speak} 
          stopSpeaking={stopSpeaking}
          isSpeaking={isSpeaking}
          onEditProfile={handleEditProfile}
        />
      )}
    </div>
  );
}

export default App;