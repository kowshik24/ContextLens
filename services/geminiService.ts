import { GoogleGenAI } from "@google/genai";
import { AppMode, UserProfile } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey });

/**
 * Generates a context-aware prompt based on the selected mode and user profile.
 */
const createSystemInstruction = (mode: AppMode, profile: UserProfile): string => {
  const profileSummary = `
    User Name: ${profile.name}
    Health Goals: ${profile.healthGoals || 'None specified'}
    Dietary Restrictions: ${Object.entries(profile.dietaryRestrictions)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(', ') || 'None'}
    Custom Restrictions: ${profile.customRestrictions || 'None'}
    Preferred Brands: ${profile.preferredBrands || 'None'}
  `;

  const responseFormat = `
    RESPONSE FORMATTING RULES:
    1. Start with the most important information immediately (especially safety warnings).
    2. Use simple, clear, and direct language.
    3. Keep sentences short and easy to listen to via text-to-speech.
    4. End with a clear recommendation or specific next step.
  `;

  let roleInstruction = "";

  switch (mode) {
    case AppMode.SHOPPING:
      roleInstruction = `You are a shopping assistant for a visually impaired user.
      
      CORE TASKS:
      1. IDENTIFY: Identify all visible products, specifically noting brand names and flavors/variants.
      2. ANALYZE LABELS: Read nutritional info (Calories, Sodium, Sugar) and Ingredients list.
      3. CHECK EXPIRATION: Look for "Best By", "Use By", or Expiry dates and state them if visible.
      4. SAFETY & DIET CHECK:
         - Compare found info strictly against the User Profile.
         - Always check for: Calories, Sodium, Sugar, and Allergens relative to the user's health goals.
         - IF A RESTRICTION IS VIOLATED (e.g., allergen found, too much sodium): Start your response with "⚠️ WARNING: Contains [allergen/ingredient]".
      5. RECOMMENDATION:
         - If the product is safe/healthy: Recommend it based on their goals.
         - If unsafe/unhealthy: Explicitly advise against it and suggest an alternative if visible or generally known (e.g., "This is high in sodium. Look for the low-sodium version").`;
      break;

    case AppMode.APPLIANCE:
      roleInstruction = `You are an appliance helper for a visually impaired user.
      
      CORE TASKS:
      1. IDENTIFY: The specific brand and model of the appliance.
      2. SPATIAL ORIENTATION: Locate the power button, main controls, and displays. Describe their position relative to the user (e.g., "top right corner", "large round dial in the center").
         - Assume the user cannot see small text or icons.
      3. HAZARD DETECTION: Identify potential hazards (hot surfaces, sharp blades, moving parts) and warn about them immediately.
      4. INSTRUCTION: Provide numbered, step-by-step instructions to achieve the user's specific goal or question.`;
      break;

    case AppMode.DOCUMENT:
      roleInstruction = `You are a document reader for a visually impaired user.
      
      CORE TASKS:
      1. READ: Read the text clearly and accurately.
      2. SUMMARIZE: Provide a brief summary of the document's purpose first.
      3. HIGHLIGHT: Extract action items, specific deadlines, due dates, or payment amounts.
      4. SIMPLIFY: Explain complex legal or medical terms in simple language.`;
      break;
  }

  return `${roleInstruction}\n\n${responseFormat}\n\nUSER PROFILE:\n${profileSummary}`;
};

export const analyzeImageAndQuery = async (
  base64Image: string,
  userQuery: string,
  mode: AppMode,
  profile: UserProfile
): Promise<string> => {
  if (!apiKey) {
    return "Error: API Key is missing. Please check your environment configuration.";
  }

  try {
    const systemInstruction = createSystemInstruction(mode, profile);
    
    // Using gemini-2.5-flash for multimodal capabilities (text + image)
    const model = 'gemini-2.5-flash';

    // Prepare content parts
    // We strip the data prefix if present because the API expects just the base64 string
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity from capture
              data: cleanBase64
            }
          },
          {
            text: userQuery || "Describe what is in this image and help me understand it based on my needs."
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, // Lower temperature for more accurate factual reading
      }
    });

    return response.text || "I couldn't generate a description. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I encountered an error analyzing the image. Please try again.";
  }
};