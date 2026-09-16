import fs from 'fs';
let content = fs.readFileSync('src/db/store.ts', 'utf8');

// Replace standard pattern: { (this.pgAdapter as any).saveMessage(msg); }
// with { await (this.pgAdapter as any).saveMessage(msg); }
content = content.replace(/\{\s*\(this\.pgAdapter\s+as\s+any\)\.([a-zA-Z0-9_]+)\(([^)]+)\)\s*;\s*\}/g, '{ await (this.pgAdapter as any).$1($2); }');

// We also need to find places where we should read from Postgres directly instead of just cache.
// For example, getUserByToken.
// But we want to preserve cache for fast read, BUT validate with postgres?
// "Odczyty dotyczące uprawnień nie mogą polegać na cache wczytanym tylko przy starcie."
// This means for `getUserByToken`, we should query PostgreSQL.

fs.writeFileSync('src/db/store.ts', content);
console.log('Fixed pgAdapter awaits.');
