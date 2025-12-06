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
    2. Use simple, clear, and direct language suitable for text-to-speech.
    3. Keep sentences short.
    4. If a safety hazard or dietary violation is found, start with "⚠️ WARNING".
    
    IMPORTANT: You MUST provide 3 short, relevant follow-up actions.
    Format them strictly at the very end of your response using this EXACT format:
    |||Action 1|Action 2|Action 3
    
    Example output:
    This soup is high in sodium (890mg). It exceeds your low-sodium limit.
    |||Suggest Low-Sodium Option|Read Ingredients|Check Serving Size
  `;

  let roleInstruction = "";

  switch (mode) {
    case AppMode.SHOPPING:
      roleInstruction = `You are a shopping assistant for a visually impaired user.
      
      TASKS:
      1. Identify visible products, brands, and variants.
      2. Analyze nutrition facts and ingredients if visible.
      3. Compare strictly against the User Profile.
      4. Warn explicitly if a restriction is violated.`;
      break;

    case AppMode.APPLIANCE:
      roleInstruction = `You are an appliance helper for a visually impaired user.
      
      TASKS:
      1. Identify the appliance model.
      2. Orient the user spatially (e.g., "knob is on the right"). Assume they cannot see small labels.
      3. Identify hazards (hot surfaces, blades).
      4. Provide numbered steps for their goal.`;
      break;

    case AppMode.DOCUMENT:
      roleInstruction = `You are a document reader for a visually impaired user.
      
      TASKS:
      1. Summarize the document's purpose.
      2. Extract action items, deadlines, and amounts.
      3. Simplify complex terms.`;
      break;
  }

  return `${roleInstruction}\n\n${responseFormat}\n\nUSER PROFILE:\n${profileSummary}`;
};

export const analyzeImageAndQuery = async (
  base64Image: string | null,
  userQuery: string,
  mode: AppMode,
  profile: UserProfile,
  previousHistory: string = ""
): Promise<string> => {
  if (!apiKey) {
    return "Error: API Key is missing. Please check your environment configuration.";
  }

  try {
    const systemInstruction = createSystemInstruction(mode, profile);
    
    // Using gemini-2.5-flash for speed and multimodal capabilities
    const model = 'gemini-2.5-flash';

    const parts: any[] = [];

    // Add image part if exists
    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64
        }
      });
    }

    // Context handling: If we had a real history array, we would map it here.
    // For now, we append the query.
    let promptText = userQuery;
    if (!promptText) {
      if (base64Image) {
        promptText = "Describe what is in this image and help me understand it based on my needs.";
      } else {
        return "Please ask a question or provide an image.";
      }
    }

    // Add previous context if provided (simple concatenation for this demo)
    if (previousHistory) {
      parts.push({ text: `PREVIOUS CONTEXT:\n${previousHistory}\n\nCURRENT REQUEST: ${promptText}` });
    } else {
      parts.push({ text: promptText });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4,
        // Leverage thinking budget for deeper reasoning on safety/diet checks
        thinkingConfig: { thinkingBudget: 1024 } 
      }
    });

    return response.text || "I couldn't generate a description. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I encountered an error. Please try again.";
  }
};