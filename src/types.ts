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
  isPremium?: boolean;
  premiumTier?: string;
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
  isPremium?: boolean;
  premiumExpiresAt?: string;
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

export type LanguageCode = 'en' | 'es' | 'de' | 'pl';

export interface UserConsents {
  necessaryCookies: boolean;
  functionalCookies: boolean;
  analyticsCookies: boolean;
  explicitSpecialCategoryConsent: boolean; // Explicit GDPR Art. 9 consent for sexual orientation data
  aiAssistanceConsent: boolean; // Consent to AI icebreakers/suggestions
  locationProcessingConsent: boolean;
  termsAcceptedVersion: string;
  privacyPolicyAcceptedVersion: string;
  updatedAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  userAgent?: string;
  ipHash?: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  targetUserId?: string;
  action: 'SUSPEND_USER' | 'RESTORE_USER' | 'DELETE_USER' | 'RESOLVE_REPORT' | 'DISMISS_REPORT' | 'APPEAL_DECISION' | 'VIEW_AUDIT_LOGS';
  reason?: string;
  legalBasis?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export type DsaReportReason = 
  | 'HATE_SPEECH'
  | 'NON_CONSENSUAL_IMAGERY'
  | 'MINOR_SAFETY'
  | 'HARASSMENT_BULLYING'
  | 'IMPERSONATION'
  | 'ILLEGAL_GOODS_SERVICES'
  | 'SPAM_SCAM'
  | 'PRIVACY_VIOLATION'
  | 'OTHER';

export type ModerationDecisionType = 'SUSPEND_ACCOUNT' | 'REMOVE_CONTENT' | 'WARNING' | 'DISMISSED';

export interface ModerationNotice {
  id: string;
  reportId?: string;
  targetUserId: string;
  decision: ModerationDecisionType;
  reason: string;
  legalBasis: string;
  statementOfReasons: string;
  createdAt: string;
  appealStatus?: 'NONE' | 'PENDING' | 'UPHELD' | 'OVERTURNED';
  appealDeadline: string; // 6 months under DSA Art. 20
}

export interface DsaAppealRecord {
  id: string;
  noticeId: string;
  userId: string;
  appealReason: string;
  status: 'PENDING' | 'UPHELD' | 'OVERTURNED';
  adminDecisionNotes?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface GdprExportData {
  exportTimestamp: string;
  checksumSha256: string;
  dataSubject: {
    id: string;
    email: string;
    role: UserRole;
    status: AccountStatus;
    isAgeVerified18Plus: boolean;
    createdAt: string;
    updatedAt: string;
  };
  profile: UserProfile;
  consents: UserConsents;
  socialData: {
    matchesCount: number;
    matches: MatchRecord[];
    likesCount: number;
    likesGiven: LikeRecord[];
    blocksCount: number;
    blockedUserIds: string[];
    reportsCount: number;
    reportsSubmitted: ReportRecord[];
  };
  messages: {
    conversationsCount: number;
    messagesSent: Message[];
  };
  moments: {
    publishedMoments: Moment[];
  };
}

// Native Ad Monetization Architecture Types
export type AdPlacement = 'discover' | 'moments' | 'radar' | 'settings';

export interface NativeAd {
  id: string;
  placement: AdPlacement;
  brandName: string;
  tagline: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
  iconUrl?: string;
  advertiserDomain: string;
  category: string;
  isNonPersonalizedOnly?: boolean;
}

export interface AdConsentState {
  consentGiven: boolean;
  allowPersonalizedAds: boolean;
  allowAnalytics: boolean;
  updatedAt: string;
}

export type AdAnalyticsEventType = 'ad_impression' | 'ad_click' | 'ad_slot_available' | 'ad_load_failed';

export interface AdAnalyticsEvent {
  eventType: AdAnalyticsEventType;
  adId: string;
  placement: AdPlacement;
  timestamp: string;
  isPersonalized: boolean;
  provider: string;
}
