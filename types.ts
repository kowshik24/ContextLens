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

export interface AnalysisResult {
  text: string;
  timestamp: number;
}
