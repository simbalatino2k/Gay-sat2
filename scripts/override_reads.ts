import fs from 'fs';
let content = fs.readFileSync('src/db/store.ts', 'utf8');

const newGetUserByToken = `  public async getUserByToken(token: string): Promise<UserAccount | null> {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\\s+/i, '').trim();
    if (!cleanToken) return null;

    if (this.pgAdapter) {
      const user = await this.pgAdapter.getUserByToken(cleanToken);
      if (user) {
         // Optionally update cache, but return from DB
         this.users.set(user.id, user);
         return user;
      }
      return null;
    }

    // Fallback to memory
    const session = this.sessions.get(cleanToken);
    if (session) {
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        this.sessions.delete(cleanToken);
        this.tokens.delete(cleanToken);
        return null;
      }
      session.lastUsedAt = new Date().toISOString();
      const user = this.users.get(session.userId);
      return user || null;
    }
    const userId = this.tokens.get(cleanToken);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }`;

// Replace the old method
content = content.replace(/public async getUserByToken[^}]*return this\.users\.get\(userId\) \|\| null;\s*\}/s, newGetUserByToken);
fs.writeFileSync('src/db/store.ts', content);
console.log('getUserByToken overridden.');
