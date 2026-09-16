import fs from 'fs';
let content = fs.readFileSync('src/db/store.ts', 'utf8');

const toReplace = [
  { match: 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveConversation === "function") { (this.pgAdapter as any).saveConversation(newConv).catch(console.error); }', rep: 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveConversation === "function") { await (this.pgAdapter as any).saveConversation(newConv); }' },
  { match: 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveBlock === "function") { (this.pgAdapter as any).saveBlock(blockRecord).catch(console.error); }', rep: 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveBlock === "function") { await (this.pgAdapter as any).saveBlock(blockRecord); }' },
  { match: 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveReport === "function") { (this.pgAdapter as any).saveReport(reportRecord).catch(console.error); }', rep: 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveReport === "function") { await (this.pgAdapter as any).saveReport(reportRecord); }' },
];

toReplace.forEach(({match, rep}) => {
  content = content.replace(match, rep);
});

// Fix any leftover `.catch` for core operations we want to throw on fail
content = content.replace(/this\.pgAdapter\.deleteSession\(cleanToken\)\.catch\([^)]+\)/g, 'await this.pgAdapter.deleteSession(cleanToken)');

fs.writeFileSync('src/db/store.ts', content);
console.log('Fixed additional awaits.');
