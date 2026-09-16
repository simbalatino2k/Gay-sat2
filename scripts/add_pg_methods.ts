import fs from 'fs';

let content = fs.readFileSync('src/db/postgres.ts', 'utf8');

const additionalMethods = `
  public async saveConversation(conv: Conversation): Promise<void> {
    await this.pool.query(
      'INSERT INTO conversations (id, participant_a_id, participant_b_id, is_match, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at, is_match = EXCLUDED.is_match',
      [conv.id, conv.participants[0], conv.participants[1], conv.isMatch, conv.createdAt, conv.updatedAt || conv.createdAt]
    );
  }

  public async saveMessage(msg: Message): Promise<void> {
    await this.pool.query(
      'INSERT INTO messages (id, conversation_id, sender_id, receiver_id, text, type, media, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status',
      [msg.id, msg.conversationId, msg.senderId, msg.receiverId, msg.text, msg.type, msg.media ? JSON.stringify(msg.media) : null, msg.status, msg.createdAt]
    );
  }

  public async saveBlock(block: BlockRecord): Promise<void> {
    await this.pool.query(
      'INSERT INTO blocks (id, blocker_user_id, blocked_user_id, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [block.id, block.blockerUserId, block.blockedUserId, block.createdAt]
    );
  }

  public async saveReport(report: ReportRecord): Promise<void> {
    await this.pool.query(
      'INSERT INTO reports (id, reporter_user_id, reported_user_id, reason, details, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
      [report.id, report.reporterUserId, report.reportedUserId, report.reason, report.details, report.status, report.createdAt]
    );
  }
`;

// Insert before the last closing brace of PostgresStoreAdapter
const lastBraceIndex = content.lastIndexOf('}');
if (lastBraceIndex !== -1) {
  content = content.substring(0, lastBraceIndex) + additionalMethods + content.substring(lastBraceIndex);
  fs.writeFileSync('src/db/postgres.ts', content);
  console.log('Added methods successfully.');
} else {
  console.error('Could not find closing brace.');
}
