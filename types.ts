export interface DietaryRestrictions {
  lowSodium: boolean;
  diabeticFriendly: boolean;
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  nutAllergy: boolean;
  lactoseIntolerant: boolean;
}

export interface UserProfile {
  name: string;
  dietaryRestrictions: DietaryRestrictions;
  customRestrictions: string;
  preferredBrands: string;
  healthGoals: string;
}

export enum AppMode {
  SHOPPING = 'Shopping',
  APPLIANCE = 'Appliance Help',
  DOCUMENT = 'Document Reading',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp: number;
  isHazard?: boolean;
  suggestions?: string[];
}

export interface AnalysisResult {
  text: string;
  timestamp: number;
  suggestions?: string[];
}