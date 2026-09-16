import fs from 'fs';
let content = fs.readFileSync('src/lib/moderation.ts', 'utf8');

content = content.replace(
  'export async function moderateText(text: string, category: ModerationCategory, userId: string): Promise<ModerationResult> {',
  'export async function moderateText(text: string, category: ModerationCategory, aiConsent: boolean = true): Promise<ModerationResult> {\n  if (category === "PRIVATE_CHAT" && !aiConsent) {\n    // User opted out of AI analysis for private content.\n    // We cannot send to Gemini. Use a basic regex for safety or just approve.\n    return { isApproved: true, confidence: 1.0, reason: "Skipped AI moderation due to privacy opt-out" };\n  }\n'
);

fs.writeFileSync('src/lib/moderation.ts', content);
console.log('Updated moderation.ts');
