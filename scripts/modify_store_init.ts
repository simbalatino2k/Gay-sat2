import fs from 'fs';

let content = fs.readFileSync('src/db/store.ts', 'utf8');

const hydrateCode = `
  public async hydrateFromPostgres(): Promise<void> {
    if (!this.pgAdapter) return;
    try {
      console.log('[DataStore] Hydrating from PostgreSQL...');
      const users = await this.pgAdapter.loadAllUsers();
      for (const u of users) {
        this.users.set(u.id, u);
      }
      const sessions = await this.pgAdapter.loadAllSessions();
      for (const s of sessions) {
        this.sessions.set(s.token, {
          token: s.token,
          userId: s.user_id,
          createdAt: s.created_at.toISOString(),
          expiresAt: s.expires_at.toISOString(),
          lastUsedAt: s.last_used_at.toISOString()
        });
        this.tokens.set(s.token, s.user_id);
      }
      const convs = await this.pgAdapter.loadAllConversations();
      for (const c of convs) {
        this.conversations.set(c.id, c);
      }
      const msgs = await this.pgAdapter.loadAllMessages();
      for (const m of msgs) {
        const arr = this.messages.get(m.conversationId) || [];
        arr.push(m);
        this.messages.set(m.conversationId, arr);
      }
      console.log('[DataStore] Hydration complete.');
    } catch (err: any) {
      console.error('[DataStore] Hydration failed:', err.message);
    }
  }
`;

content = content.replace('class DataStore {', 'class DataStore {\n' + hydrateCode);
fs.writeFileSync('src/db/store.ts', content);
console.log('Added hydrateFromPostgres to DataStore.');
