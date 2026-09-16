import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const profileMod = `
    if (req.body.bio || req.body.displayName) {
      const textToModerate = \`\${req.body.displayName || ''} \${req.body.bio || ''}\`;
      const modResult = await moderateText(textToModerate, 'PUBLIC_PROFILE', true);
      if (!modResult.isApproved) {
        return res.status(400).json({ error: 'Profile content rejected by safety policy.', reason: modResult.reason });
      }
    }
`;

content = content.replace('const updated = await store.updateProfile(req.user!.id, req.body);', profileMod + '\n    const updated = await store.updateProfile(req.user!.id, req.body);');
fs.writeFileSync('server.ts', content);
