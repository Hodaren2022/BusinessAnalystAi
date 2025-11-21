
import { GoogleGenAI, Type } from "@google/genai";
import { Message, ProjectData, UserRole, AnalysisPerspective, AppSettings } from "../types";
import { DEFAULT_SYSTEM_INSTRUCTION } from "../constants";

// --- CRITICAL CONFIGURATION ---
// The user has explicitly requested this to be the UNIQUE and ONLY key used.
// It overrides all settings, fallbacks, and environment variables.
const MASTER_API_KEY = "AIzaSyAUHP82uV93_Zok_4F5QVDSv-PsTWkahOU";

const getAIClient = () => {
    // Always initialize with the MASTER_API_KEY
    console.log("🔵 Initializing Gemini Client with MASTER KEY:", MASTER_API_KEY);
    return new GoogleGenAI({ apiKey: MASTER_API_KEY });
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    // Even if testing a specific key input, we default to checking the master key connection 
    // if the context implies we should be valid. 
    // However, usually 'validateApiKey' checks a specific input string.
    // To be safe and consistent with "This is the ONLY key", we verify the Master Key connectivity.
    
    try {
        const ai = getAIClient();
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: "Test connection" }] }
        });
        return true;
    } catch (error) {
        console.error("Master API Key Validation Failed:", error);
        throw error;
    }
};

interface AIResponseOptions {
  attachment?: {
    base64: string;
    mimeType: string;
  };
  signal?: AbortSignal;
}

export const generateResponse = async (
  history: Message[],
  userMessage: string,
  settings: AppSettings,
  perspective: AnalysisPerspective = '3rd_person',
  systemInstruction: string = DEFAULT_SYSTEM_INSTRUCTION,
  options?: AIResponseOptions
): Promise<string> => {
  
  // Initialize AI with the Master Key
  const ai = getAIClient();
  
  // FIX: Gemini API throws error if 'text' is empty string. Default to single space if content is missing.
  const historyContent = history.map(msg => ({
    role: msg.role === UserRole.USER ? 'user' : 'model',
    parts: [{ text: msg.content && msg.content.trim() !== '' ? msg.content : " " }] 
  }));

  const perspectiveInstruction = perspective === '1st_person' 
    ? "Adopt a coaching role. Address the user as 'you' (the business owner). Help them refine THEIR ideas." 
    : "Adopt an analyst role. Address the business as a third-party entity (e.g., 'the company', 'the project'). Be objective.";

  let fullSystemInstruction = `${systemInstruction}\n\nCURRENT PERSPECTIVE: ${perspectiveInstruction}`;
  
  if (settings.userPreferences && settings.userPreferences.trim() !== '') {
      fullSystemInstruction += `\n\nUSER PREFERENCES / RESPONSE STYLE: ${settings.userPreferences}\nEnsure you follow these specific user preferences in your response.`;
  }

  const chat = ai.chats.create({
    model: settings.model,
    config: {
      temperature: settings.temperature,
      systemInstruction: fullSystemInstruction,
    },
    history: historyContent
  });

  const messageParts: any[] = [];
  
  if (userMessage && userMessage.trim() !== '') {
    messageParts.push({ text: userMessage });
  } else if (!options?.attachment) {
    messageParts.push({ text: " " }); 
  }

  if (options?.attachment) {
    messageParts.push({
      inlineData: {
        mimeType: options.attachment.mimeType,
        data: options.attachment.base64
      }
    });
  }

  const sendMessagePromise = chat.sendMessage({ 
    message: messageParts
  });

  if (options?.signal) {
      if (options.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
      }
      return Promise.race([
          sendMessagePromise.then(result => result.text || "I couldn't generate a response."),
          new Promise<string>((_, reject) => {
              options.signal?.addEventListener("abort", () => {
                  reject(new DOMException("Aborted", "AbortError"));
              });
          })
      ]);
  }

  const result = await sendMessagePromise;
  return result.text || "I couldn't generate a response.";
};

export const analyzeProjectData = async (
  conversationText: string,
  currentData: ProjectData,
  attachment?: { base64: string; mimeType: string },
  customApiKey?: string // Argument ignored to enforce Master Key
): Promise<ProjectData> => {
  
  try {
    const ai = getAIClient();
    
    const prompt = `
      Analyze the conversation history (and any attached file) about a business model.
      Extract or update the structured data for the project.
      Keep existing data if no new information is provided for that section.
      
      Current Data Context:
      ${JSON.stringify(currentData)}
      
      Conversation History:
      ${conversationText}
      
      Return the updated ProjectData JSON.
    `;

    const parts: any[] = [{ text: prompt }];
    
    if (attachment) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64
        }
      });
    }

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stakeholders: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  needs: { type: Type.STRING },
                  interestScore: { type: Type.INTEGER },
                  powerScore: { type: Type.INTEGER },
                }
              }
            },
            swot: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  content: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['strength', 'weakness', 'opportunity', 'threat'] },
                  impactScore: { type: Type.INTEGER },
                }
              }
            },
            keyMetrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  value: { type: Type.STRING }
                }
              }
            },
            keyAssumptions: {
               type: Type.ARRAY,
               items: { type: Type.STRING }
            },
            valueProposition: { type: Type.STRING },
            customerSegments: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (result.text) {
      try {
        let cleanText = result.text.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```/, '').replace(/```$/, '');
        }
        return JSON.parse(cleanText) as ProjectData;
      } catch (e) {
        console.error("Failed to parse ProjectData JSON.", e);
        return currentData;
      }
    }
    return currentData;
  } catch (error) {
    // Silence analysis errors (like rate limits) to avoid disrupting the chat flow
    console.warn("Background analysis skipped due to error:", error);
    return currentData;
  }
};

export const generateExecutiveReport = async (data: ProjectData, customApiKey?: string): Promise<string> => {
  const ai = getAIClient();
  
  const prompt = `
    Generate a professional, data-driven Executive Summary Report in Markdown format based on:
    ${JSON.stringify(data)}
  `;

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  return result.text || "Failed to generate report.";
};

export const generateProjectVideo = async (data: ProjectData, customApiKey?: string): Promise<string> => {
  const ai = getAIClient();
  
  const visualPrompt = `Cinematic, high-quality, photorealistic video concept for a business: ${data.valueProposition}. 
  Target audience: ${data.customerSegments.join(', ')}.`;

  // Use 'veo-3.1-fast-generate-preview' or 'veo-3.1-generate-preview'
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: visualPrompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p', 
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); 
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed to return a URI");

  return `${downloadLink}&key=${MASTER_API_KEY}`;
};

export const generatePodcastScript = async (data: ProjectData, customApiKey?: string): Promise<string> => {
    const ai = getAIClient();
    const prompt = `Create a podcast script about this business data: ${JSON.stringify(data)}`;
  
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
  
    return result.text || "Script generation failed.";
};
