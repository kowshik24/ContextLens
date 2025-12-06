import { AppMode, DietaryRestrictions } from './types';

export const DEFAULT_DIETARY_RESTRICTIONS: DietaryRestrictions = {
  lowSodium: false,
  diabeticFriendly: false,
  vegan: false,
  vegetarian: false,
  glutenFree: false,
  nutAllergy: false,
  lactoseIntolerant: false,
};

export const MODES = [
  { id: AppMode.SHOPPING, label: 'Shopping Assistant', icon: '🛒' },
  { id: AppMode.APPLIANCE, label: 'Appliance Help', icon: '🔌' },
  { id: AppMode.DOCUMENT, label: 'Document Reader', icon: '📄' },
];

export const DIETARY_LABELS: Record<keyof DietaryRestrictions, string> = {
  lowSodium: 'Low-Sodium',
  diabeticFriendly: 'Diabetic-Friendly',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  glutenFree: 'Gluten-Free',
  nutAllergy: 'Nut Allergy',
  lactoseIntolerant: 'Lactose Intolerant',
};
