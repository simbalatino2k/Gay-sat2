import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const importMod = "import { moderateText } from './src/lib/moderation.js';\n";
if (!content.includes('import { moderateText }')) {
  content = importMod + content;
}

// Find `store.sendMessage` call
// Usually it's `const message = await store.sendMessage(`
const sendMessageRegex = /(const\s+message\s*=\s*await\s+store\.sendMessage\([^\)]+\)\s*;)/;

const moderationCode = `
    // --- MODERATION START ---
    if (text) {
      const consents = await store.getUserConsents(req.user!.id);
      const modResult = await moderateText(text, 'PRIVATE_CHAT', consents.aiAssistanceConsent);
      if (!modResult.isApproved) {
        return res.status(400).json({ error: 'Message blocked by moderation policy.', reason: modResult.reason });
      }
    }
    // --- MODERATION END ---

    `;

content = content.replace(sendMessageRegex, moderationCode + '$1');
fs.writeFileSync('server.ts', content);
console.log('Moderation added to sendMessage in server.ts');
