import fs from 'fs';
let content = fs.readFileSync('src/db/store.ts', 'utf8');

const newIsBlocked = `  public async isBlocked(userA: string, userB: string): Promise<boolean> {
    if (this.pgAdapter && typeof (this.pgAdapter as any).isBlocked === "function") {
      return (this.pgAdapter as any).isBlocked(userA, userB);
    }
    return this.blocks.some(b => 
      (b.blockerUserId === userA && b.blockedUserId === userB) ||
      (b.blockerUserId === userB && b.blockedUserId === userA)
    );
  }`;

// Replace the old method
content = content.replace(/public async isBlocked[^}]*return this\.blocks\.some[^}]*\);[\s]*\}/s, newIsBlocked);
fs.writeFileSync('src/db/store.ts', content);
console.log('isBlocked overridden.');
