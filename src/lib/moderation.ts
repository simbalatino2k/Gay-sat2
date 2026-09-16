import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getStore } from '../db/store.js'; // Assuming we export a way to get store

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export type ModerationCategory = 'PUBLIC_PROFILE' | 'PRIVATE_CHAT';

export interface ModerationResult {
  isApproved: boolean;
  reason?: string;
  confidence: number;
}

const moderationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isApproved: { type: Type.BOOLEAN, description: 'True if the content is allowed.' },
    reason: { type: Type.STRING, description: 'Reason for rejection if any.' },
    confidence: { type: Type.NUMBER, description: 'Confidence score from 0.0 to 1.0' }
  },
  required: ['isApproved', 'confidence']
};

export async function moderateText(text: string, category: ModerationCategory, aiConsent: boolean = true): Promise<ModerationResult> {
  if (category === "PRIVATE_CHAT" && !aiConsent) {
    // User opted out of AI analysis for private content.
    // We cannot send to Gemini. Use a basic regex for safety or just approve.
    return { isApproved: true, confidence: 1.0, reason: "Skipped AI moderation due to privacy opt-out" };
  }

  // Fail closed if no AI
  if (!ai) return { isApproved: false, reason: 'Moderation service unavailable', confidence: 1.0 };
  
  const systemInstruction = category === 'PUBLIC_PROFILE' 
    ? 'You are a strict Trust & Safety moderator for an 18+ dating app. This text is for a PUBLIC profile. Reject any text containing hate speech, illegal acts, CSAM, non-consensual content, or extreme toxicity. Flirting and adult themes are allowed, but public profiles must not contain explicit pornographic text or solicitations for illegal sex work.'
    : 'You are a Trust & Safety moderator for an 18+ dating app. This text is a PRIVATE chat between consenting adults. Adult language, roleplay, and explicit consensual flirting are completely ALLOWED. Only reject CSAM, terrorist content, severe non-consensual harm, or illegal drug trafficking.';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: moderationSchema,
        temperature: 0.1
      }
    });

    if (!response.text) return { isApproved: false, reason: 'AI returned empty', confidence: 0 };
    const result = JSON.parse(response.text) as ModerationResult;
    return result;
  } catch (err: any) {
    console.error('Moderation error:', err);
    // Fail closed
    return { isApproved: false, reason: 'Moderation timeout or error', confidence: 0 };
  }
}
