import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const checkCode = `
    if (record.category === 'profile_photo' && record.moderationStatus !== 'APPROVED') {
      if (record.ownerId !== requestingUserId) {
        return res.status(403).json({ error: 'This profile photo is pending moderation and is currently unavailable.' });
      }
    }
`;

content = content.replace('// 3. Conversation access control & block check', checkCode + '\n    // 3. Conversation access control & block check');
fs.writeFileSync('server.ts', content);
console.log('Added media moderation check.');
