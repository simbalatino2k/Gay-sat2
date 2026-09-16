import fs from 'fs';

let content = fs.readFileSync('src/db/store.ts', 'utf8');

// Replace this.saveToDisk() with this.saveToDisk(); \n if (this.pgAdapter) { /* sync */ }
// But wait, there are too many specific objects to sync.

content = content.replace(
  'this.saveToDisk();',
  'this.saveToDisk();\n    if (this.pgAdapter && typeof (this.pgAdapter as any).saveUser === "function" && user) { (this.pgAdapter as any).saveUser(user).catch(console.error); }'
);
