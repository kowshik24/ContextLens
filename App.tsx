import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from './types';
import ProfileSetup from './components/ProfileSetup';
import MainAssistant from './components/MainAssistant';

function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Load profile and voice settings from local storage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('contextLensProfile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }

    const savedVoice = localStorage.getItem('contextLensVoiceEnabled');
    if (savedVoice) {
      setVoiceEnabled(JSON.parse(savedVoice));
    }
  }, []);

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    setIsEditing(false);
    localStorage.setItem('contextLensProfile', JSON.stringify(profile));
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      const newState = !prev;
      localStorage.setItem('contextLensVoiceEnabled', JSON.stringify(newState));
      if (!newState) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      return newState;
    });
  };

  // Text-to-Speech Helper
  const speak = useCallback((text: string, force = false) => {
    if (!('speechSynthesis' in window)) return;
    
    // Check if voice is enabled or forced
    if (!voiceEnabled && !force) return;
    
    // Cancel any current speech to prioritize new message
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Prefer a clear, default voice
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

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
      {(!userProfile || isEditing) ? (
        <ProfileSetup 
          onSave={handleSaveProfile} 
          speak={speak} 
          voiceEnabled={voiceEnabled}
          toggleVoice={toggleVoice}
          initialData={userProfile}
          onBack={userProfile ? handleCancelEdit : undefined}
        />
      ) : (
        <MainAssistant 
          profile={userProfile} 
          speak={speak} 
          stopSpeaking={stopSpeaking}
          isSpeaking={isSpeaking}
          onEditProfile={handleEditProfile}
          voiceEnabled={voiceEnabled}
          toggleVoice={toggleVoice}
        />
      )}
    </div>
  );
}

export default App;