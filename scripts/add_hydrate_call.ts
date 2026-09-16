import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'async function startServer() {',
  'async function startServer() {\n  // Hydrate memory store from PostgreSQL\n  await store.hydrateFromPostgres();\n'
);

fs.writeFileSync('server.ts', content);
console.log('Added hydration call to server.ts');
