import fs from 'fs';
import path from 'path';
import { AURA_ALBUM_PHOTOS } from '../data/auraAlbum';
import {
  UserAccount,
  UserProfile,
  LikeRecord,
  MatchRecord,
  BlockRecord,
  ReportRecord,
  Conversation,
  Message,
  Moment,
  FilterState,
  AdminStats,
  AccountStatus
} from '../types';

// Pre-seeded high quality realistic 18+ profiles distributed across global queer metropolises
const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'prof-marcus',
    userId: 'user-marcus',
    displayName: 'Marcus',
    age: 28,
    identityRole: 'Vers Top',
    location: 'Nearby',
    distanceKm: 0.015,
    lat: 51.5134,
    lng: -0.1365,
    bio: 'Architect & design nerd. Looking for deep talks over espresso, late night gallery walks, and weekend road trips.',
    heightCm: 185,
    weightKg: 82,
    relationshipStatus: 'Single',
    lookingFor: ['Dating', 'Relationship'],
    tribes: ['Jock', 'Clean Cut'],
    interests: ['Architecture', 'Art Galleries', 'Espresso', 'Pilates', 'House Music'],
    photos: [
      { id: 'ph-m1', url: AURA_ALBUM_PHOTOS[0], isPrimary: true },
      { id: 'ph-m2', url: AURA_ALBUM_PHOTOS[1], isPrimary: false },
      { id: 'ph-m3', url: AURA_ALBUM_PHOTOS[2], isPrimary: false }
    ],
    verified: true,
    isOnline: true,
    lastActiveMinutesAgo: 2,
    instagramHandle: '@marcus.arch',
    spotifyTopArtist: 'Rufus Du Sol'
  },
  {
    id: 'prof-julian',
    userId: 'user-julian',
    displayName: 'Julian',
    age: 25,
    identityRole: 'Versatile',
    location: 'Nearby',
    distanceKm: 0.030,
    lat: 52.4980,
    lng: 13.3550,
    bio: 'Software engineer by day, analog synth enthusiast by night. Let us grab matcha or catch an indie film.',
    heightCm: 178,
    weightKg: 73,
    relationshipStatus: 'Single',
    lookingFor: ['Friends', 'Dating', 'Right Now'],
    tribes: ['Otter', 'Geek'],
    interests: ['Synthesizers', 'Indie Cinema', 'Matcha', 'Cycling', 'Vinyl'],
    photos: [
      { id: 'ph-j1', url: AURA_ALBUM_PHOTOS[3], isPrimary: true },
      { id: 'ph-j2', url: AURA_ALBUM_PHOTOS[4], isPrimary: false }
    ],
    verified: true,
    isOnline: true,
    lastActiveMinutesAgo: 5,
    instagramHandle: '@julian.synth',
    spotifyTopArtist: 'Fred again..'
  },
  {
    id: 'prof-mateo',
    userId: 'user-mateo',
    displayName: 'Mateo',
    age: 32,
    identityRole: 'Top',
    location: 'Centro',
    distanceKm: 0.150,
    lat: 40.4225,
    lng: -3.6975,
    bio: 'Chef & restaurant owner. Passionate about natural wine, sourdough, and long late-night conversations.',
    heightCm: 188,
    weightKg: 88,
    relationshipStatus: 'Single',
    lookingFor: ['Relationship', 'Dating'],
    tribes: ['Bear', 'Cub'],
    interests: ['Cooking', 'Natural Wine', 'Dog Walking', 'Cocktails', 'Jazz'],
    photos: [
      { id: 'ph-mat1', url: AURA_ALBUM_PHOTOS[5], isPrimary: true },
      { id: 'ph-mat2', url: AURA_ALBUM_PHOTOS[6], isPrimary: false }
    ],
    verified: true,
    isOnline: false,
    lastActiveMinutesAgo: 45,
    instagramHandle: '@chef_mateo'
  },
  {
    id: 'prof-alex',
    userId: 'user-alex',
    displayName: 'Alex',
    age: 23,
    identityRole: 'Vers Bottom',
    location: 'Arts District',
    distanceKm: 0.500,
    lat: 48.8570,
    lng: 2.3580,
    bio: 'Graphic designer & photographer. Always down for gallery afternoon walks, riverside coffee, and rooftop sunsets.',
    heightCm: 175,
    weightKg: 68,
    relationshipStatus: 'Single',
    lookingFor: ['Dating', 'Hookups'],
    tribes: ['Twink', 'Clean Cut'],
    interests: ['Design', 'Photography', 'Art', 'Coffee', 'House Music'],
    photos: [
      { id: 'ph-a1', url: AURA_ALBUM_PHOTOS[7], isPrimary: true },
      { id: 'ph-a2', url: AURA_ALBUM_PHOTOS[8], isPrimary: false }
    ],
    verified: false,
    isOnline: true,
    lastActiveMinutesAgo: 1,
    instagramHandle: '@alex_paris'
  },
  {
    id: 'prof-dante',
    userId: 'user-dante',
    displayName: 'Dante',
    age: 36,
    identityRole: 'Top',
    location: 'Downtown',
    distanceKm: 1.2,
    lat: 40.7335,
    lng: -74.0028,
    bio: 'Creative Director in fashion. Into gym training, high fashion, contemporary galleries, and intimate dinner parties.',
    heightCm: 186,
    weightKg: 85,
    relationshipStatus: 'Single',
    lookingFor: ['Dating', 'Relationship'],
    tribes: ['Daddy', 'Muscle', 'Leather'],
    interests: ['Fashion', 'Gym', 'Travel', 'Cocktails', 'Contemporary Art'],
    photos: [
      { id: 'ph-d1', url: AURA_ALBUM_PHOTOS[9], isPrimary: true },
      { id: 'ph-d2', url: AURA_ALBUM_PHOTOS[10], isPrimary: false }
    ],
    verified: true,
    isOnline: true,
    lastActiveMinutesAgo: 0
  },
  {
    id: 'prof-leo',
    userId: 'user-leo',
    displayName: 'Leo',
    age: 29,
    identityRole: 'Bottom',
    location: 'Westside',
    distanceKm: 2.1,
    lat: 35.6905,
    lng: 139.7090,
    bio: 'Architectural designer & plant dad. Keeping things chill, authentic, and present. Exploring Ni-chome and quiet kissaten.',
    heightCm: 176,
    weightKg: 70,
    relationshipStatus: 'Single',
    lookingFor: ['Friends', 'Dating', 'Chat'],
    tribes: ['Queer', 'Otter'],
    interests: ['Design', 'Plants', 'Coffee', 'Hiking', 'Vinyl'],
    photos: [
      { id: 'ph-l1', url: AURA_ALBUM_PHOTOS[11], isPrimary: true },
      { id: 'ph-l2', url: AURA_ALBUM_PHOTOS[12], isPrimary: false }
    ],
    verified: true,
    isOnline: false,
    lastActiveMinutesAgo: 120
  },
  {
    id: 'prof-gabriel',
    userId: 'user-gabriel',
    displayName: 'Gabriel',
    age: 31,
    identityRole: 'Versatile',
    location: 'Uptown',
    distanceKm: 3.5,
    lat: 34.0880,
    lng: -118.3760,
    bio: 'Filmmaker & screenwriter in West Hollywood. Love natural wine, canyon hikes, and cinema marathons.',
    heightCm: 181,
    weightKg: 77,
    relationshipStatus: 'Single',
    lookingFor: ['Dating', 'Friends', 'Chat'],
    tribes: ['Clean Cut', 'Queer'],
    interests: ['Cinema', 'Writing', 'Hiking', 'Natural Wine', 'Coffee'],
    photos: [
      { id: 'ph-g1', url: AURA_ALBUM_PHOTOS[13], isPrimary: true },
      { id: 'ph-g2', url: AURA_ALBUM_PHOTOS[14], isPrimary: false }
    ],
    verified: true,
    isOnline: true,
    lastActiveMinutesAgo: 10
  }
];

// Pre-seeded User accounts
const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-demo',
    email: 'demo@auragay.com',
    role: 'USER',
    status: 'ACTIVE',
    isAgeVerified18Plus: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      id: 'prof-demo',
      userId: 'user-demo',
      displayName: 'Christian',
      age: 27,
      identityRole: 'Versatile',
      location: 'West Hollywood, CA',
      distanceKm: 0,
      bio: 'Creative technologist & coffee lover. Exploring music venues, rooftop sunsets, and spontaneous weekend trips.',
      heightCm: 182,
      weightKg: 78,
      relationshipStatus: 'Single',
      lookingFor: ['Dating', 'Relationship', 'Friends'],
      tribes: ['Clean Cut', 'Jock'],
      interests: ['Tech', 'Photography', 'Coffee', 'Travel', 'Running'],
      photos: [
        { id: 'ph-demo1', url: AURA_ALBUM_PHOTOS[13], isPrimary: true },
        { id: 'ph-demo2', url: AURA_ALBUM_PHOTOS[14], isPrimary: false }
      ],
      verified: true,
      isOnline: true,
      lastActiveMinutesAgo: 0
    }
  },
  {
    id: 'user-admin',
    email: 'admin@auragay.com',
    role: 'SUPERADMIN',
    status: 'ACTIVE',
    isAgeVerified18Plus: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      id: 'prof-admin',
      userId: 'user-admin',
      displayName: 'AURA Safety Admin',
      age: 30,
      identityRole: 'Unspecified',
      location: 'System Command',
      distanceKm: 0,
      bio: 'Official AURA Safety & Community Moderation Team.',
      lookingFor: ['Networking'],
      tribes: ['Clean Cut'],
      interests: ['Community Safety', 'Security', 'Moderation'],
      photos: [
        { id: 'ph-admin1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800', isPrimary: true }
      ],
      verified: true,
      isOnline: true,
      lastActiveMinutesAgo: 0
    }
  },
  ...INITIAL_PROFILES.map(p => ({
    id: p.userId,
    email: `${p.displayName.toLowerCase()}@auragay.com`,
    role: 'USER' as const,
    status: 'ACTIVE' as const,
    isAgeVerified18Plus: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: p
  }))
];

// Seeded sample conversations and messages for demo user
const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-marcus',
    participantIds: ['user-demo', 'user-marcus'],
    unreadCount: 1,
    otherParticipant: INITIAL_PROFILES[0], // Marcus
    lastMessage: {
      id: 'msg-m3',
      conversationId: 'conv-marcus',
      senderId: 'user-marcus',
      receiverId: 'user-demo',
      type: 'TEXT',
      text: 'Hey Christian! Loved your photography shots on your profile. Up for grabbing an espresso this evening?',
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
    }
  },
  {
    id: 'conv-julian',
    participantIds: ['user-demo', 'user-julian'],
    unreadCount: 0,
    otherParticipant: INITIAL_PROFILES[1], // Julian
    lastMessage: {
      id: 'msg-j2',
      conversationId: 'conv-julian',
      senderId: 'user-demo',
      receiverId: 'user-julian',
      type: 'TEXT',
      text: 'That synth setup you have looks unreal! What model is that synth?',
      status: 'READ',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    }
  }
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  'conv-marcus': [
    {
      id: 'msg-m1',
      conversationId: 'conv-marcus',
      senderId: 'user-demo',
      receiverId: 'user-marcus',
      type: 'TEXT',
      text: 'Hey Marcus, awesome meeting you on AURA!',
      status: 'READ',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
    },
    {
      id: 'msg-m2',
      conversationId: 'conv-marcus',
      senderId: 'user-marcus',
      receiverId: 'user-demo',
      type: 'TEXT',
      text: 'Hey Christian! Thanks, loved your photography shots on your profile. Up for grabbing an espresso this evening?',
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
    }
  ],
  'conv-julian': [
    {
      id: 'msg-j1',
      conversationId: 'conv-julian',
      senderId: 'user-julian',
      receiverId: 'user-demo',
      type: 'TEXT',
      text: 'Hey! Nice to connect.',
      status: 'READ',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
    },
    {
      id: 'msg-j2',
      conversationId: 'conv-julian',
      senderId: 'user-demo',
      receiverId: 'user-julian',
      type: 'TEXT',
      text: 'That synth setup you have looks unreal! What model is that synth?',
      status: 'READ',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    }
  ]
};

const INITIAL_MOMENTS: Moment[] = [
  {
    id: 'mom-1',
    userId: 'user-marcus',
    mediaUrl: AURA_ALBUM_PHOTOS[15],
    mediaType: 'photo',
    caption: 'Sunset vibes in West Hollywood 🌆✨',
    privacy: 'everyone',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 22).toISOString(),
    viewsCount: 42,
    likesCount: 18,
    hasLiked: false
  },
  {
    id: 'mom-2',
    userId: 'user-julian',
    mediaUrl: AURA_ALBUM_PHOTOS[16],
    mediaType: 'photo',
    caption: 'Late night studio sessions & analog synth jam 🎹🔥',
    privacy: 'everyone',
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 19).toISOString(),
    viewsCount: 29,
    likesCount: 12,
    hasLiked: false
  },
  {
    id: 'mom-3',
    userId: 'user-mateo',
    mediaUrl: AURA_ALBUM_PHOTOS[17],
    mediaType: 'photo',
    caption: 'Fresh natural wine pairing menu ready for tonight! 🍷',
    privacy: 'everyone',
    createdAt: new Date(Date.now() - 1000 * 60 * 450).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 16.5).toISOString(),
    viewsCount: 55,
    likesCount: 24,
    hasLiked: false
  },
  {
    id: 'mom-4',
    userId: 'user-alex',
    mediaUrl: AURA_ALBUM_PHOTOS[18],
    mediaType: 'photo',
    caption: 'Golden hour at Santa Monica beach 🏄‍♂️🌊',
    privacy: 'everyone',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(),
    viewsCount: 38,
    likesCount: 15,
    hasLiked: false
  }
];

class DataStore {
  private users: Map<string, UserAccount> = new Map();
  private tokens: Map<string, string> = new Map(); // token -> userId
  private likes: LikeRecord[] = [];
  private matches: MatchRecord[] = [];
  private blocks: BlockRecord[] = [];
  private reports: ReportRecord[] = [];
  private moments: Moment[] = [];
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private dbFilePath = path.join(process.cwd(), 'data', 'aura_db.json');

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serialized = {
        users: Array.from(this.users.entries()),
        tokens: Array.from(this.tokens.entries()),
        likes: this.likes,
        matches: this.matches,
        blocks: this.blocks,
        reports: this.reports,
        moments: this.moments,
        conversations: Array.from(this.conversations.entries()),
        messages: Array.from(this.messages.entries())
      };
      fs.writeFileSync(this.dbFilePath, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DataStore] Error saving to disk:', err);
    }
  }

  private loadFromDisk(): boolean {
    try {
      if (!fs.existsSync(this.dbFilePath)) return false;
      const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
      if (!raw.trim()) return false;
      const data = JSON.parse(raw);

      this.users = new Map(data.users || []);
      this.tokens = new Map(data.tokens || []);
      this.likes = data.likes || [];
      this.matches = data.matches || [];
      this.blocks = data.blocks || [];
      this.reports = data.reports || [];
      this.moments = data.moments || [];
      this.conversations = new Map(data.conversations || []);
      this.messages = new Map(data.messages || []);
      return true;
    } catch (err) {
      console.error('[DataStore] Error loading from disk:', err);
      return false;
    }
  }

  constructor() {
    if (this.loadFromDisk()) {
      console.log('[DataStore] Loaded persistent data from disk.');
    } else {
      console.log('[DataStore] Seeding initial demo data...');
      // Seed initial users
      INITIAL_USERS.forEach(user => {
        this.users.set(user.id, user);
      });

      // Seed initial moments
      this.moments = [...INITIAL_MOMENTS];

      // Seed conversations & messages
      INITIAL_CONVERSATIONS.forEach(conv => {
        this.conversations.set(conv.id, conv);
      });

      Object.entries(INITIAL_MESSAGES).forEach(([convId, msgs]) => {
        this.messages.set(convId, msgs);
      });

      // Seed mutual matches
      this.matches.push({
        id: 'match-marcus',
        user1Id: 'user-demo',
        user2Id: 'user-marcus',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        matchedProfile: INITIAL_PROFILES[0]
      });

      this.matches.push({
        id: 'match-julian',
        user1Id: 'user-demo',
        user2Id: 'user-julian',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        matchedProfile: INITIAL_PROFILES[1]
      });

      this.saveToDisk();
    }
  }

  // --- Auth Methods ---
  public registerUser(email: string, displayName: string, age: number, role: string = 'USER'): { token: string; user: UserAccount } {
    const cleanEmail = email.toLowerCase().trim();
    const existing = Array.from(this.users.values()).find(u => u.email === cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please log in instead.');
    }

    const userId = `user-${Date.now()}`;
    const profileId = `prof-${Date.now()}`;

    const newUserProfile: UserProfile = {
      id: profileId,
      userId: userId,
      displayName: displayName.trim() || 'New Member',
      age: age || 24,
      identityRole: 'Versatile',
      location: 'Los Angeles, CA',
      distanceKm: 0.5,
      bio: 'New on AURA! Excited to connect with amazing people.',
      lookingFor: ['Dating', 'Friends'],
      tribes: ['Clean Cut'],
      interests: ['Travel', 'Art', 'Fitness'],
      photos: [
        {
          id: `ph-${Date.now()}`,
          url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
          isPrimary: true
        }
      ],
      verified: true,
      isOnline: true,
      lastActiveMinutesAgo: 0
    };

    const newUser: UserAccount = {
      id: userId,
      email: cleanEmail,
      role: role === 'SUPERADMIN' ? 'SUPERADMIN' : 'USER',
      status: 'ACTIVE',
      isAgeVerified18Plus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: newUserProfile
    };

    this.users.set(userId, newUser);
    const token = `aura_sess_${userId}_${Date.now()}`;
    this.tokens.set(token, userId);
    this.saveToDisk();

    return { token, user: newUser };
  }

  public loginUser(email: string): { token: string; user: UserAccount } | null {
    const cleanEmail = email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find(u => u.email === cleanEmail);
    if (!user) return null;

    if (user.status !== 'ACTIVE') {
      throw new Error(`Account is ${user.status.toLowerCase()}`);
    }

    const token = `aura_sess_${user.id}_${Date.now()}`;
    this.tokens.set(token, user.id);
    this.saveToDisk();
    return { token, user };
  }

  public getUserByToken(token: string): UserAccount | null {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

    // 1. Direct session token mapping
    const userId = this.tokens.get(cleanToken);
    if (userId) {
      const user = this.users.get(userId) || null;
      if (user && user.status === 'ACTIVE') {
        return user;
      }
    }

    // 2. Demo token fallback
    if (cleanToken === 'demo-token' || cleanToken === 'aura-demo-token' || cleanToken === 'aura_auth_token' || cleanToken.startsWith('demo')) {
      return this.users.get('user-demo') || Array.from(this.users.values())[0] || null;
    }

    // 3. Check if cleanToken is directly a user ID in the system
    if (this.users.has(cleanToken)) {
      const directUser = this.users.get(cleanToken)!;
      if (directUser.status === 'ACTIVE') return directUser;
    }

    // 4. Decode Firebase JWT token if passed
    if (cleanToken.includes('.')) {
      try {
        const parts = cleanToken.split('.');
        if (parts.length === 3) {
          const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadStr);
          const fbUid = payload.user_id || payload.sub;
          if (fbUid) {
            let user = this.users.get(fbUid);
            if (!user) {
              const email = payload.email || `${fbUid}@user.auragay.com`;
              user = {
                id: fbUid,
                email,
                role: email.toLowerCase().includes('admin') ? 'SUPERADMIN' : 'USER',
                status: 'ACTIVE',
                isAgeVerified18Plus: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                profile: {
                  id: `prof-${fbUid}`,
                  userId: fbUid,
                  displayName: payload.name || email.split('@')[0] || 'AURA Member',
                  age: 26,
                  identityRole: 'Versatile',
                  location: 'Global Member',
                  distanceKm: 1.2,
                  bio: 'Connecting on AURA 18+.',
                  lookingFor: ['Dating', 'Friends'],
                  tribes: ['Clean Cut'],
                  interests: ['Design', 'Music', 'Fitness'],
                  photos: [
                    { id: `ph-${fbUid}-1`, url: payload.picture || AURA_ALBUM_PHOTOS[0], isPrimary: true }
                  ],
                  verified: true,
                  isOnline: true,
                  lastActiveMinutesAgo: 0
                }
              };
              this.users.set(fbUid, user);
              this.saveToDisk();
            }
            this.tokens.set(cleanToken, fbUid);
            return user;
          }
        }
      } catch (err) {
        // Not a valid JWT or parse error, continue
      }
    }

    return null;
  }

  public invalidateToken(token: string): boolean {
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const res = this.tokens.delete(cleanToken);
    this.saveToDisk();
    return res;
  }

  public getUserById(userId: string): UserAccount | null {
    return this.users.get(userId) || null;
  }

  // --- Profile Methods ---
  public updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    // Prevent overwriting internal user IDs
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).id;
    delete (safeUpdates as any).userId;

    user.profile = {
      ...user.profile,
      ...safeUpdates,
      userId
    };

    user.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return user.profile;
  }

  public addProfilePhoto(userId: string, url: string, isPrimary: boolean = false): UserProfile {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:image/')) {
      throw new Error('Invalid image URL format');
    }

    const newPhoto = {
      id: `ph-${Date.now()}`,
      url: cleanUrl,
      isPrimary: isPrimary || user.profile.photos.length === 0
    };

    if (newPhoto.isPrimary) {
      user.profile.photos.forEach(p => (p.isPrimary = false));
    }

    user.profile.photos.push(newPhoto);
    this.saveToDisk();
    return user.profile;
  }

  public deleteProfilePhoto(userId: string, photoId: string): UserProfile {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    user.profile.photos = user.profile.photos.filter(p => p.id !== photoId);
    if (user.profile.photos.length > 0 && !user.profile.photos.some(p => p.isPrimary)) {
      user.profile.photos[0].isPrimary = true;
    }

    this.saveToDisk();
    return user.profile;
  }

  // --- Discovery Feed & Filtering ---
  public getDiscoverFeed(currentUserId: string, filters?: Partial<FilterState>): UserProfile[] {
    // Get list of blocked user IDs
    const blockedUserIds = new Set<string>();
    this.blocks.forEach(b => {
      if (b.blockerUserId === currentUserId) blockedUserIds.add(b.blockedUserId);
      if (b.blockedUserId === currentUserId) blockedUserIds.add(b.blockerUserId);
    });

    let eligible = Array.from(this.users.values())
      .filter(u => u.id !== currentUserId)
      .filter(u => u.status === 'ACTIVE')
      .filter(u => !blockedUserIds.has(u.id))
      .map(u => u.profile);

    const filtered = filters
      ? eligible.filter(p => {
          if (filters.minAge && p.age < filters.minAge) return false;
          if (filters.maxAge && p.age > filters.maxAge) return false;
          if (filters.maxDistanceKm && p.distanceKm > filters.maxDistanceKm) return false;
          if (filters.verifiedOnly && !p.verified) return false;
          if (filters.onlineOnly && !p.isOnline) return false;
          if (filters.hasPhotosOnly && p.photos.length === 0) return false;
          if (filters.roles && filters.roles.length > 0) {
            if (!filters.roles.includes(p.identityRole)) return false;
          }
          if (filters.tribes && filters.tribes.length > 0) {
            const hasTribe = p.tribes.some(t => filters.tribes?.includes(t));
            if (!hasTribe) return false;
          }
          return true;
        })
      : eligible;

    return filtered.map(p => this.sanitizeProfilePrivacy(p));
  }

  /**
   * Sanitizes user coordinates to enforce privacy-safe location:
   * - HIDDEN: completely removes latitude and longitude
   * - EXACT: retains coordinates only with explicit permission
   * - APPROXIMATE (Default): applies deterministic ~1.5km fuzzy offset
   * Never exposes exact physical address to other users.
   */
  public sanitizeProfilePrivacy(profile: UserProfile): UserProfile {
    const privacy = profile.locationPrivacy || 'APPROXIMATE';

    if (privacy === 'HIDDEN') {
      const copy = { ...profile };
      delete copy.lat;
      delete copy.lng;
      copy.locationPrivacy = 'HIDDEN';
      copy.approximateArea = 'Location Hidden';
      copy.distanceKm = Math.round(profile.distanceKm || 0);
      return copy;
    }

    if (privacy === 'EXACT') {
      const copy = { ...profile };
      copy.locationPrivacy = 'EXACT';
      copy.approximateArea = 'Exact (Permission Granted)';
      copy.distanceKm = Math.round((profile.distanceKm || 0) * 1000) / 1000;
      if (copy.lat !== undefined) {
        copy.lat = Math.round(copy.lat * 1000) / 1000;
      }
      if (copy.lng !== undefined) {
        copy.lng = Math.round(copy.lng * 1000) / 1000;
      }
      return copy;
    }

    // Default: APPROXIMATE
    const copy = { ...profile };
    copy.locationPrivacy = 'APPROXIMATE';

    if (profile.lat !== undefined && profile.lng !== undefined) {
      let hash = 0;
      const str = (profile.userId || profile.id) + 'aura-privacy-salt-2026';
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
      const offsetKm = 1.2 + ((Math.abs(hash >> 3) % 100) / 100) * 1.0;
      const latOffset = (offsetKm / 111.0) * Math.cos(angle);
      const lngOffset =
        (offsetKm / (111.0 * Math.cos(((profile.lat || 34) * Math.PI) / 180))) * Math.sin(angle);

      copy.lat = Math.round((profile.lat + latOffset) * 1000) / 1000;
      copy.lng = Math.round((profile.lng + lngOffset) * 1000) / 1000;
    }

    const dist = profile.distanceKm !== undefined ? profile.distanceKm : 1;
    if (dist <= 0.02) {
      copy.approximateArea = '~15m far';
    } else if (dist <= 0.045) {
      copy.approximateArea = '~30m far';
    } else if (dist < 1) {
      copy.approximateArea = `~${Math.round(dist * 1000)}m`;
    } else {
      copy.approximateArea = `Within ~${Math.round(dist)} km`;
    }
    copy.distanceKm = dist;
    return copy;
  }

  // --- Social Interactions (Like, Match, Block, Report) ---
  public likeUser(fromUserId: string, toUserId: string, isSuperLike: boolean = false): { isMatch: boolean; match?: MatchRecord } {
    if (fromUserId === toUserId) {
      throw new Error('Cannot like yourself');
    }

    if (this.isBlocked(fromUserId, toUserId)) {
      throw new Error('Action blocked by user policy');
    }

    const existingLike = this.likes.find(l => l.fromUserId === fromUserId && l.toUserId === toUserId);
    if (!existingLike) {
      this.likes.push({
        id: `like-${Date.now()}`,
        fromUserId,
        toUserId,
        isSuperLike,
        createdAt: new Date().toISOString()
      });
    }

    // Check mutual like
    const reciprocalLike = this.likes.find(l => l.fromUserId === toUserId && l.toUserId === fromUserId);
    if (reciprocalLike) {
      let match = this.matches.find(m => (m.user1Id === fromUserId && m.user2Id === toUserId) || (m.user1Id === toUserId && m.user2Id === fromUserId));
      if (!match) {
        const targetUser = this.users.get(toUserId);
        match = {
          id: `match-${Date.now()}`,
          user1Id: fromUserId,
          user2Id: toUserId,
          createdAt: new Date().toISOString(),
          matchedProfile: targetUser?.profile
        };
        this.matches.push(match);

        // Auto create conversation
        this.getOrCreateConversation(fromUserId, toUserId);
      }
      this.saveToDisk();
      return { isMatch: true, match };
    }

    this.saveToDisk();
    return { isMatch: false };
  }

  public blockUser(blockerUserId: string, blockedUserId: string): BlockRecord {
    if (blockerUserId === blockedUserId) {
      throw new Error('Cannot block yourself');
    }

    const existing = this.blocks.find(b => b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId);
    if (existing) return existing;

    const record: BlockRecord = {
      id: `block-${Date.now()}`,
      blockerUserId,
      blockedUserId,
      createdAt: new Date().toISOString()
    };
    this.blocks.push(record);
    this.saveToDisk();
    return record;
  }

  public unblockUser(blockerUserId: string, blockedUserId: string): boolean {
    const initialLen = this.blocks.length;
    this.blocks = this.blocks.filter(b => !(b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId));
    const changed = this.blocks.length < initialLen;
    if (changed) this.saveToDisk();
    return changed;
  }

  public getBlockedUsers(userId: string): UserProfile[] {
    const blockedIds = this.blocks.filter(b => b.blockerUserId === userId).map(b => b.blockedUserId);
    return blockedIds.map(id => this.users.get(id)?.profile).filter((p): p is UserProfile => !!p);
  }

  public isBlocked(userA: string, userB: string): boolean {
    return this.blocks.some(b => 
      (b.blockerUserId === userA && b.blockedUserId === userB) ||
      (b.blockerUserId === userB && b.blockedUserId === userA)
    );
  }

  public reportUser(reporterUserId: string, reportedUserId: string, reason: string, details?: string): ReportRecord {
    if (reporterUserId === reportedUserId) {
      throw new Error('Cannot report yourself');
    }

    const reportedUser = this.users.get(reportedUserId);
    const report: ReportRecord = {
      id: `rep-${Date.now()}`,
      reporterUserId,
      reportedUserId,
      reason: reason.trim(),
      details: details ? details.trim() : undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      reportedProfile: reportedUser?.profile
    };
    this.reports.push(report);
    this.saveToDisk();
    return report;
  }

  // --- Conversations & Messaging ---
  public getOrCreateConversation(userAId: string, userBId: string): Conversation {
    const convKey = [userAId, userBId].sort().join('_');
    let conv = Array.from(this.conversations.values()).find(c => {
      const sorted = [...c.participantIds].sort().join('_');
      return sorted === convKey;
    });

    if (!conv) {
      const otherUser = this.users.get(userBId);
      if (!otherUser) throw new Error('Recipient user not found');

      conv = {
        id: `conv-${Date.now()}`,
        participantIds: [userAId, userBId],
        unreadCount: 0,
        otherParticipant: otherUser.profile
      };
      this.conversations.set(conv.id, conv);
      this.messages.set(conv.id, []);
      this.saveToDisk();
    }

    return conv;
  }

  public getUserConversations(userId: string): Conversation[] {
    const blockedUserIds = new Set(
      this.blocks
        .filter(b => b.blockerUserId === userId || b.blockedUserId === userId)
        .map(b => (b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId))
    );

    return Array.from(this.conversations.values())
      .filter(c => c.participantIds.includes(userId))
      .filter(c => {
        const otherId = c.participantIds.find(id => id !== userId);
        if (!otherId) return false;
        if (blockedUserIds.has(otherId)) return false;
        const otherUser = this.users.get(otherId);
        return otherUser && otherUser.status === 'ACTIVE';
      })
      .map(c => {
        const otherId = c.participantIds.find(id => id !== userId)!;
        const otherProfile = this.users.get(otherId)!.profile;
        const convMsgs = this.messages.get(c.id) || [];
        const lastMsg = convMsgs[convMsgs.length - 1];
        const unreadCount = convMsgs.filter(m => m.receiverId === userId && m.status !== 'READ').length;

        return {
          ...c,
          otherParticipant: otherProfile,
          lastMessage: lastMsg,
          unreadCount
        };
      })
      .sort((a, b) => {
        const tA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const tB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return tB - tA;
      });
  }

  public getMessages(conversationId: string, requestingUserId: string): Message[] {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(requestingUserId)) {
      throw new Error('Unauthorized conversation access');
    }

    const otherId = conv.participantIds.find(id => id !== requestingUserId)!;
    if (this.isBlocked(requestingUserId, otherId)) {
      throw new Error('Access blocked by user policy');
    }

    return this.messages.get(conversationId) || [];
  }

  public sendMessage(senderId: string, conversationId: string, payload: Partial<Message>): Message {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(senderId)) {
      throw new Error('Unauthorized conversation access');
    }

    const receiverId = conv.participantIds.find(id => id !== senderId)!;
    if (this.isBlocked(senderId, receiverId)) {
      throw new Error('Cannot message a blocked user');
    }

    const receiverUser = this.users.get(receiverId);
    if (!receiverUser || receiverUser.status !== 'ACTIVE') {
      throw new Error('Recipient account is not active');
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      receiverId,
      type: payload.type || 'TEXT',
      text: payload.text?.trim(),
      photoUrl: payload.photoUrl?.trim(),
      media: payload.media,
      linkPreview: payload.linkPreview,
      location: payload.location,
      stickerId: payload.stickerId,
      stickerUrl: payload.stickerUrl,
      stickerName: payload.stickerName,
      status: 'DELIVERED', // Marked delivered in system
      createdAt: new Date().toISOString()
    };

    const msgs = this.messages.get(conversationId) || [];
    msgs.push(newMessage);
    this.messages.set(conversationId, msgs);

    conv.lastMessage = newMessage;
    this.conversations.set(conversationId, conv);

    this.saveToDisk();
    return newMessage;
  }

  public markMessagesRead(conversationId: string, userId: string): void {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(userId)) {
      return;
    }

    const msgs = this.messages.get(conversationId) || [];
    let updated = false;
    msgs.forEach(m => {
      if (m.receiverId === userId && m.status !== 'READ') {
        m.status = 'READ';
        updated = true;
      }
    });

    if (updated) {
      this.saveToDisk();
    }
  }

  // --- Matches ---
  public getUserMatches(userId: string): MatchRecord[] {
    const blockedUserIds = new Set(
      this.blocks
        .filter(b => b.blockerUserId === userId || b.blockedUserId === userId)
        .map(b => (b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId))
    );

    const result: MatchRecord[] = [];
    for (const m of this.matches) {
      if (m.user1Id === userId || m.user2Id === userId) {
        const otherId = m.user1Id === userId ? m.user2Id : m.user1Id;
        if (blockedUserIds.has(otherId)) continue;
        const otherUser = this.users.get(otherId);
        if (!otherUser || otherUser.status !== 'ACTIVE') continue;
        result.push({
          ...m,
          matchedProfile: otherUser.profile
        });
      }
    }
    return result;
  }

  // --- Admin & Safety Moderation ---
  public getReports(): ReportRecord[] {
    return this.reports;
  }

  public suspendUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.status = 'SUSPENDED';
    user.updatedAt = new Date().toISOString();

    // Invalidate all tokens for this suspended user
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }

    this.saveToDisk();
    return true;
  }

  public softDeleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.status = 'DELETED';
    user.updatedAt = new Date().toISOString();

    // Invalidate all tokens for this deleted user
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }

    this.saveToDisk();
    return true;
  }

  public getAdminStats(): AdminStats {
    const usersArr = Array.from(this.users.values());
    return {
      totalUsers: usersArr.length,
      activeUsers: usersArr.filter(u => u.status === 'ACTIVE').length,
      suspendedUsers: usersArr.filter(u => u.status === 'SUSPENDED').length,
      pendingReports: this.reports.filter(r => r.status === 'PENDING').length,
      totalMatches: this.matches.length,
      totalMessagesSent: Array.from(this.messages.values()).reduce((acc, m) => acc + m.length, 0)
    };
  }

  // --- Moments / Stories ---
  public getMoments(userId: string): Moment[] {
    const now = new Date();
    const blockedUserIds = new Set(
      this.blocks
        .filter(b => b.blockerUserId === userId || b.blockedUserId === userId)
        .map(b => (b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId))
    );

    return this.moments
      .filter(m => new Date(m.expiresAt) > now)
      .filter(m => !blockedUserIds.has(m.userId))
      .filter(m => {
        if (m.userId === userId) return true;
        if (m.privacy === 'everyone') return true;
        if (m.privacy === 'specific' && m.allowedUserIds) {
          return m.allowedUserIds.includes(userId);
        }
        return true;
      })
      .map(m => {
        const creator = this.users.get(m.userId);
        return {
          ...m,
          creatorProfile: creator?.profile
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createMoment(
    userId: string,
    data: { mediaUrl: string; mediaType?: 'photo' | 'video'; caption?: string; privacy?: 'everyone' | 'connections' | 'specific'; allowedUserIds?: string[] }
  ): Moment {
    const newMoment: Moment = {
      id: `mom-${Date.now()}`,
      userId,
      mediaUrl: data.mediaUrl.trim(),
      mediaType: data.mediaType || 'photo',
      caption: data.caption ? data.caption.trim() : undefined,
      privacy: data.privacy || 'everyone',
      allowedUserIds: data.allowedUserIds,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
      viewsCount: 0,
      likesCount: 0,
      hasLiked: false
    };

    const creator = this.users.get(userId);
    newMoment.creatorProfile = creator?.profile;

    this.moments.unshift(newMoment);
    this.saveToDisk();
    return newMoment;
  }

  public likeMoment(userId: string, momentId: string): boolean {
    const mom = this.moments.find(m => m.id === momentId);
    if (!mom) return false;
    mom.likesCount = (mom.likesCount || 0) + 1;
    mom.hasLiked = true;
    this.saveToDisk();
    return true;
  }

  public viewMoment(userId: string, momentId: string): boolean {
    const mom = this.moments.find(m => m.id === momentId);
    if (!mom) return false;
    mom.viewsCount = (mom.viewsCount || 0) + 1;
    this.saveToDisk();
    return true;
  }

  public deleteMoment(userId: string, momentId: string): boolean {
    const idx = this.moments.findIndex(m => m.id === momentId && m.userId === userId);
    if (idx === -1) return false;
    this.moments.splice(idx, 1);
    this.saveToDisk();
    return true;
  }
}

export const store = new DataStore();
