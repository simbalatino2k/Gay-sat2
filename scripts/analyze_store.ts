import fs from 'fs';
const content = fs.readFileSync('src/db/store.ts', 'utf8');
const methods = content.match(/public [a-zA-Z0-9_]+\(/g);
console.log(`Found ${methods ? methods.length : 0} public methods in store.ts`);
