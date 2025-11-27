import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing from environment");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const enhanceMaintenanceRequest = async (rawInput: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return rawInput; // Fallback

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a professional property manager assistant. 
      Rewrite the following maintenance issue to be clear, professional, and urgent if necessary. 
      Keep it under 30 words.
      Input: "${rawInput}"`,
    });
    
    return response.text || rawInput;
  } catch (error) {
    console.error("AI Error:", error);
    return rawInput;
  }
};
