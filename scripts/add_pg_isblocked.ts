import fs from 'fs';

let content = fs.readFileSync('src/db/postgres.ts', 'utf8');

const newMethods = `
  public async isBlocked(userA: string, userB: string): Promise<boolean> {
    const res = await this.pool.query(
      'SELECT 1 FROM blocks WHERE (blocker_user_id = $1 AND blocked_user_id = $2) OR (blocker_user_id = $2 AND blocked_user_id = $1) LIMIT 1',
      [userA, userB]
    );
    return res.rows.length > 0;
  }
`;

const lastBraceIndex = content.lastIndexOf('}');
if (lastBraceIndex !== -1) {
  content = content.substring(0, lastBraceIndex) + newMethods + content.substring(lastBraceIndex);
  fs.writeFileSync('src/db/postgres.ts', content);
  console.log('Added isBlocked to postgres.ts');
}
