import fs from 'fs';

let content = fs.readFileSync('src/db/store.ts', 'utf8');

const replaceInMethod = (methodStart: RegExp, returnStatement: string, pgCode: string) => {
  const methodRegex = new RegExp(`(public\\s+async\\s+${methodStart.source}[^\\{]+\\{)(.*?)(return\\s+${returnStatement}\\s*;)`, 's');
  content = content.replace(methodRegex, (match, p1, p2, p3) => {
    // avoid double injection
    if (p2.includes(pgCode)) return match;
    return `${p1}${p2}${pgCode}\n    ${p3}`;
  });
};

replaceInMethod(/getOrCreateConversation/, 'conv', 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveConversation === "function") { await (this.pgAdapter as any).saveConversation({ id: conv.id, participants: conv.participantIds, isMatch: false, createdAt: new Date().toISOString() }); }');

replaceInMethod(/submitDsaReport/, 'report', 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveReport === "function") { await (this.pgAdapter as any).saveReport({ id: report.id, reporterUserId: report.reporterUserId, reportedUserId: report.reportedUserId, reason: report.reason, details: report.details, status: report.status, createdAt: report.createdAt }); }');

replaceInMethod(/reportUser/, 'report', 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveReport === "function") { await (this.pgAdapter as any).saveReport({ id: report.id, reporterUserId: report.reporterUserId, reportedUserId: report.reportedUserId, reason: report.reason, details: report.details, status: report.status, createdAt: report.createdAt }); }');

replaceInMethod(/blockUser/, 'block', 'if (this.pgAdapter && typeof (this.pgAdapter as any).saveBlock === "function") { await (this.pgAdapter as any).saveBlock({ id: block.id, blockerUserId: block.blockerUserId, blockedUserId: block.blockedUserId, createdAt: block.createdAt }); }');

fs.writeFileSync('src/db/store.ts', content);
console.log('Added missing PG sync calls.');
