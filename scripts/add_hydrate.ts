import fs from 'fs';

let content = fs.readFileSync('src/db/postgres.ts', 'utf8');

const hydrateMethods = `
  public async loadAllUsers(): Promise<UserAccount[]> {
    const res = await this.pool.query('SELECT * FROM users');
    return res.rows.map(row => this.mapUserRow(row));
  }
  public async loadAllSessions(): Promise<any[]> {
    const res = await this.pool.query('SELECT * FROM sessions');
    return res.rows;
  }
  public async loadAllConversations(): Promise<Conversation[]> {
    const res = await this.pool.query('SELECT * FROM conversations');
    return res.rows.map(row => ({
      id: row.id,
      participants: [row.participant_a_id, row.participant_b_id],
      isMatch: row.is_match,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      settings: {}
    }));
  }
  public async loadAllMessages(): Promise<Message[]> {
    const res = await this.pool.query('SELECT * FROM messages');
    return res.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      text: row.text,
      type: row.type,
      media: row.media,
      status: row.status,
      createdAt: row.created_at.toISOString()
    }));
  }
`;

const lastBraceIndex = content.lastIndexOf('}');
if (lastBraceIndex !== -1) {
  content = content.substring(0, lastBraceIndex) + hydrateMethods + content.substring(lastBraceIndex);
  fs.writeFileSync('src/db/postgres.ts', content);
  console.log('Added hydrate methods successfully.');
}
