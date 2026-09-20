import { GoogleGenAI, Type, Schema } from '@google/genai';

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

export async function moderateText(
  text: string,
  category: ModerationCategory,
  aiConsent: boolean = true,
  timeoutMs: number = 5000
): Promise<ModerationResult> {
  // 1. Private chat privacy check: Do not send to AI without explicit user consent.
  // Skipping AI analysis must not be recorded as positive AI verification (confidence must be 0).
  if (category === 'PRIVATE_CHAT' && !aiConsent) {
    return {
      isApproved: true,
      confidence: 0,
      reason: 'Skipped AI moderation due to lack of consent (not verified by AI)'
    };
  }

  // 2. Fail closed if AI moderation is unavailable
  if (!ai) {
    return {
      isApproved: false,
      reason: 'Moderation service unavailable',
      confidence: 0
    };
  }

  // 3. Strict separation of public profile vs. private chat guidelines
  const systemInstruction = category === 'PUBLIC_PROFILE'
    ? 'You are a strict Trust & Safety moderator for an 18+ dating app. This text is for a PUBLIC profile. Reject any text containing hate speech, illegal acts, CSAM, non-consensual content, or extreme toxicity. Flirting and adult themes are allowed, but public profiles must not contain explicit pornographic text or solicitations for illegal sex work.'
    : 'You are a Trust & Safety moderator for an 18+ dating app. This text is a PRIVATE chat between consenting adults. Adult language, roleplay, and explicit consensual flirting are completely ALLOWED. Only reject CSAM, terrorist content, severe non-consensual harm, or illegal drug trafficking.';

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Moderation request timed out')), timeoutMs);
    });

    const generatePromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: moderationSchema,
        temperature: 0.1
      }
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    if (!response || !response.text) {
      return {
        isApproved: false,
        reason: 'Moderation service returned empty response',
        confidence: 0
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      return {
        isApproved: false,
        reason: 'Moderation service returned unparseable JSON',
        confidence: 0
      };
    }

    // 4. Runtime validation: isApproved must be boolean, confidence must be a number between 0 and 1
    if (
      typeof parsed?.isApproved !== 'boolean' ||
      typeof parsed?.confidence !== 'number' ||
      isNaN(parsed.confidence) ||
      parsed.confidence < 0 ||
      parsed.confidence > 1
    ) {
      return {
        isApproved: false,
        reason: 'Invalid moderation response schema from model',
        confidence: 0
      };
    }

    return {
      isApproved: parsed.isApproved,
      confidence: parsed.confidence,
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined
    };
  } catch (err: any) {
    console.error('[Moderation] Error or timeout during text moderation:', err.message || err);
    // Fail closed: blocked on error/timeout for safety
    return {
      isApproved: false,
      reason: 'Moderation request timeout or error',
      confidence: 0
    };
  }
}
