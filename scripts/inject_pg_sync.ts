import fs from 'fs';
let content = fs.readFileSync('src/db/store.ts', 'utf8');

// For sendMessage
content = content.replace(
  'return msg;',
  'if (this.pgAdapter && typeof (this.pgAdapter as any).saveMessage === "function") { (this.pgAdapter as any).saveMessage(msg).catch(console.error); }\n    return msg;'
);
fs.writeFileSync('src/db/store.ts', content);
