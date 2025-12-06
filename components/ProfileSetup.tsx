import React, { useState } from 'react';
import { UserProfile, DietaryRestrictions } from '../types';
import { DEFAULT_DIETARY_RESTRICTIONS, DIETARY_LABELS } from '../constants';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';

interface ProfileSetupProps {
  onSave: (profile: UserProfile) => void;
  speak: (text: string, force?: boolean) => void;
  voiceEnabled: boolean;
  toggleVoice: () => void;
  initialData?: UserProfile | null;
  onBack?: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ 
  onSave, 
  speak, 
  voiceEnabled, 
  toggleVoice,
  initialData,
  onBack
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [dietary, setDietary] = useState<DietaryRestrictions>(initialData?.dietaryRestrictions || DEFAULT_DIETARY_RESTRICTIONS);
  const [customRestrictions, setCustomRestrictions] = useState(initialData?.customRestrictions || '');
  const [brands, setBrands] = useState(initialData?.preferredBrands || '');
  const [goals, setGoals] = useState(initialData?.healthGoals || '');

  const handleDietaryChange = (key: keyof DietaryRestrictions) => {
    setDietary(prev => {
      const newVal = !prev[key];
      speak(`${DIETARY_LABELS[key]} ${newVal ? 'selected' : 'unselected'}`);
      return { ...prev, [key]: newVal };
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      speak("Please enter your name to continue.");
      return;
    }
    const profile: UserProfile = {
      name,
      dietaryRestrictions: dietary,
      customRestrictions,
      preferredBrands: brands,
      healthGoals: goals
    };
    speak("Profile saved successfully. Welcome to Context Lens.");
    onSave(profile);
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6 pb-24 min-h-[100dvh]">
      <div className="flex justify-between items-center mb-6 md:mb-8 border-b-2 border-yellow-600 pb-4">
        <div className="flex items-center gap-3 md:gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 md:p-3 rounded-full border-2 border-zinc-600 bg-zinc-800 text-yellow-400 hover:bg-zinc-700 hover:border-yellow-600 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={24} className="md:w-8 md:h-8" />
            </button>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-300">
            Profile Setup
          </h1>
        </div>
        
        <button
          onClick={toggleVoice}
          className={`
            p-3 rounded-full border-2 transition-colors flex items-center gap-2
            ${voiceEnabled ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-zinc-800 text-zinc-400 border-zinc-600'}
          `}
          aria-label={voiceEnabled ? "Disable voice feedback" : "Enable voice feedback"}
          aria-pressed={voiceEnabled}
        >
          {voiceEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          <span className="text-sm font-bold hidden md:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
        </button>
      </div>

      <div className="space-y-6 md:space-y-8">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-xl md:text-2xl font-semibold mb-2 md:mb-3">
            What should I call you?
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 md:p-4 bg-zinc-800 border-2 border-yellow-600 rounded-lg text-white text-lg md:text-xl focus:bg-zinc-700"
            placeholder="Enter your name"
          />
        </div>

        {/* Dietary Restrictions */}
        <fieldset className="border-2 border-zinc-700 p-4 md:p-6 rounded-xl">
          <legend className="text-xl md:text-2xl font-semibold px-2 text-yellow-200">
            Dietary Restrictions
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-2 md:mt-4">
            {(Object.keys(DIETARY_LABELS) as Array<keyof DietaryRestrictions>).map((key) => (
              <label 
                key={key} 
                className={`
                  flex items-center p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-colors active:scale-[0.98]
                  ${dietary[key] ? 'bg-yellow-900 border-yellow-400' : 'bg-zinc-800 border-zinc-600'}
                `}
              >
                <input
                  type="checkbox"
                  checked={dietary[key]}
                  onChange={() => handleDietaryChange(key)}
                  className="w-6 h-6 md:w-8 md:h-8 mr-3 md:mr-4 accent-yellow-400 flex-shrink-0"
                />
                <span className="text-lg md:text-xl">{DIETARY_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Text Inputs */}
        {[
          { id: 'custom', label: 'Other Restrictions / Allergies', value: customRestrictions, setter: setCustomRestrictions },
          { id: 'brands', label: 'Preferred Brands', value: brands, setter: setBrands },
          { id: 'goals', label: 'Health Goals', value: goals, setter: setGoals, placeholder: 'e.g., lower cholesterol' }
        ].map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="block text-xl md:text-2xl font-semibold mb-2 md:mb-3">
              {field.label}
            </label>
            <textarea
              id={field.id}
              value={field.value}
              onChange={(e) => field.setter(e.target.value)}
              className="w-full p-3 md:p-4 bg-zinc-800 border-2 border-yellow-600 rounded-lg text-white text-lg md:text-xl focus:bg-zinc-700 min-h-[100px]"
              placeholder={field.placeholder || ''}
            />
          </div>
        ))}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-5 md:py-6 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-2xl md:text-3xl rounded-xl shadow-lg transform transition active:scale-95 mt-6 md:mt-8"
        >
          Save Profile
        </button>
      </div>
    </div>
  );
};

export default ProfileSetup;