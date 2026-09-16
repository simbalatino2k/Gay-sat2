import fs from 'fs';
let postgresContent = fs.readFileSync('src/db/postgres.ts', 'utf8');

const newMethod = `
  public async saveUserAndSession(user: UserAccount, token: string, expiresAt: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const p = user.profile;
      await client.query(
        \`INSERT INTO users (
          id, email, display_name, age, role, status, bio,
          sexual_role, tribe, looking_for, vibe, interests,
          location, photos, is_verified, is_premium, premium_tier, privacy,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18,
          $19, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          age = EXCLUDED.age,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          bio = EXCLUDED.bio,
          sexual_role = EXCLUDED.sexual_role,
          tribe = EXCLUDED.tribe,
          looking_for = EXCLUDED.looking_for,
          vibe = EXCLUDED.vibe,
          interests = EXCLUDED.interests,
          location = EXCLUDED.location,
          photos = EXCLUDED.photos,
          is_verified = EXCLUDED.is_verified,
          is_premium = EXCLUDED.is_premium,
          premium_tier = EXCLUDED.premium_tier,
          privacy = EXCLUDED.privacy,
          updated_at = CURRENT_TIMESTAMP\`,
        [
          user.id, user.email, user.profile.displayName, user.profile.age, user.role, user.status, p.bio || null,
          p.sexualRole || null, p.tribe || null, p.lookingFor || null, p.vibe || null, p.interests ? JSON.stringify(p.interests) : null,
          p.location || null, p.photos ? JSON.stringify(p.photos) : null, p.verified || false, user.isPremium || false, user.premiumTier || 'none',
          p.privacy ? JSON.stringify(p.privacy) : null,
          user.createdAt
        ]
      );

      await client.query(
        'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at, last_used_at = CURRENT_TIMESTAMP',
        [token, user.id, expiresAt]
      );
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
`;

postgresContent = postgresContent.replace('public async saveUser', newMethod + '\n  public async saveUser');
fs.writeFileSync('src/db/postgres.ts', postgresContent);

let storeContent = fs.readFileSync('src/db/store.ts', 'utf8');
storeContent = storeContent.replace(
  'if (this.pgAdapter) { await this.pgAdapter.saveUser(user); await this.pgAdapter.createSession(token, user.id, new Date(expiresAt)); }',
  'if (this.pgAdapter) { await (this.pgAdapter as any).saveUserAndSession(user, token, new Date(expiresAt)); }'
);
fs.writeFileSync('src/db/store.ts', storeContent);

console.log('Added transactional saveUserAndSession.');
