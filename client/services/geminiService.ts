import { GoogleGenAI } from "@google/genai";

// NOTE: In a real production app, never expose API keys on the client side.
// This should proxy through a backend. We assume process.env.API_KEY is available or user provides it.
const getApiKey = (): string | undefined => {
  return process.env.API_KEY || localStorage.getItem('gemini_api_key') || undefined;
};

export const chatWithSolarAssistant = async (
  message: string,
  context: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key missing. Please set your Google Gemini API Key in settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Use a model suitable for reasoning and chat
  const modelId = 'gemini-2.5-flash';

  const systemInstruction = `You are an expert Solar PV Design Assistant for a SaaS platform called "SolarDesign Pro".
  You help engineers with:
  1. Technical advice (tilt angles, azimuth, string sizing).
  2. Financial definitions (ROI, LCOE, NPV).
  3. Equipment recommendations based on specs.
  
  Current Project Context: ${context}
  
  Keep answers concise, professional, and technical.`;

  try {
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
      },
      history: history,
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};
