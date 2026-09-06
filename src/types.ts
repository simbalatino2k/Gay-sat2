export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPERADMIN';

export type SexualRole = 'Top' | 'Vers Top' | 'Versatile' | 'Vers Bottom' | 'Bottom' | 'Side' | 'Unspecified';

export type Tribe = 
  | 'Bear' 
  | 'Otter' 
  | 'Cub' 
  | 'Jock' 
  | 'Twink' 
  | 'Geek' 
  | 'Daddy' 
  | 'Leather' 
  | 'Clean Cut' 
  | 'Muscle' 
  | 'Trans' 
  | 'Queer' 
  | 'Pup';

export type LookingFor = 
  | 'Dating' 
  | 'Hookups' 
  | 'Friends' 
  | 'Networking' 
  | 'Relationship' 
  | 'Right Now' 
  | 'Chat';

export interface ProfilePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  isPrivate?: boolean;
  caption?: string;
}

export type LocationPrivacyMode = 'APPROXIMATE' | 'EXACT' | 'HIDDEN';

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  age: number;
  identityRole: SexualRole;
  location: string;
  distanceKm: number;
  lat?: number;
  lng?: number;
  locationPrivacy?: LocationPrivacyMode;
  approximateArea?: string;
  bio: string;
  heightCm?: number;
  weightKg?: number;
  relationshipStatus?: string;
  lookingFor: LookingFor[];
  tribes: Tribe[];
  interests: string[];
  photos: ProfilePhoto[];
  verified: boolean;
  isOnline: boolean;
  lastActiveMinutesAgo: number;
  instagramHandle?: string;
  spotifyTopArtist?: string;
}

export interface QueerVenue {
  id: string;
  name: string;
  category: 'bar' | 'club' | 'cafe' | 'wellness' | 'community';
  lat: number;
  lng: number;
  address: string;
  neighborhood: string;
  description: string;
  distanceKm: number;
  tags: string[];
  imageUrl?: string;
  isVerified?: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  isAgeVerified18Plus: boolean;
  createdAt: string;
  updatedAt: string;
  profile: UserProfile;
}

export interface LikeRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  isSuperLike: boolean;
  createdAt: string;
}

export interface MatchRecord {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  matchedProfile?: UserProfile;
}

export interface BlockRecord {
  id: string;
  blockerUserId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface ReportRecord {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reportedProfile?: UserProfile;
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export type MessageType = 'TEXT' | 'PHOTO' | 'LINK' | 'LOCATION' | 'STICKER' | 'VOICE' | 'STAR_VIDEO';

export interface MessageMediaInfo {
  url: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  sizeBytes?: number;
}

export interface LinkPreviewInfo {
  url: string;
  domain: string;
  title?: string;
  thumbnailUrl?: string;
}

export interface LocationInfo {
  lat: number;
  lng: number;
  approximateArea?: string;
  distanceKm?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  text?: string;
  photoUrl?: string; // legacy support
  media?: MessageMediaInfo;
  linkPreview?: LinkPreviewInfo;
  location?: LocationInfo;
  stickerId?: string;
  stickerUrl?: string;
  stickerName?: string;
  status: MessageStatus;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  otherParticipant: UserProfile;
}

export interface FilterState {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  roles: SexualRole[];
  lookingFor: LookingFor[];
  tribes: Tribe[];
  verifiedOnly: boolean;
  onlineOnly: boolean;
  hasPhotosOnly: boolean;
}

export type MomentPrivacy = 'everyone' | 'connections' | 'specific';
export type MomentMediaType = 'photo' | 'video';

export interface Moment {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: MomentMediaType;
  caption?: string;
  privacy: MomentPrivacy;
  allowedUserIds?: string[];
  createdAt: string;
  expiresAt: string;
  creatorProfile?: UserProfile;
  viewsCount: number;
  likesCount: number;
  hasLiked?: boolean;
}

export interface IcebreakerRequest {
  targetProfileId: string;
  tone?: 'flirty' | 'witty' | 'chill' | 'deep';
}

export interface IcebreakerResponse {
  icebreakers: string[];
  suggestedByAI: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingReports: number;
  totalMatches: number;
  totalMessagesSent: number;
}

export interface AuthSession {
  token: string;
  user: UserAccount;
}
