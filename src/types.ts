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
  isLocked?: boolean;
  caption?: string;
}

export type LocationPrivacyMode = 'APPROXIMATE' | 'EXACT' | 'HIDDEN';

export type UserStatusMode = 
  | 'ONLINE' 
  | 'HOT_NOW' 
  | 'FLYING_MOOD' 
  | 'DISPONIBLE' 
  | 'CHILL' 
  | 'OFFLINE';

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
  userMode?: UserStatusMode;
  modeUpdatedAt?: string;
  instagramHandle?: string;
  spotifyTopArtist?: string;
  isPremium?: boolean;
  premiumTier?: string;
}

export type VenueCategory = 'cruising' | 'sauna' | 'bar' | 'club' | 'cafe' | 'wellness' | 'community';

export interface QueerVenue {
  id: string;
  name: string;
  category: VenueCategory;
  lat: number;
  lng: number;
  address: string;
  neighborhood: string;
  city?: string;
  description: string;
  distanceKm: number;
  tags: string[];
  imageUrl?: string;
  isVerified?: boolean;
  isCruising?: boolean;
  openingHours?: string;
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
  isSuperMatch?: boolean;
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
  reportedMessageId?: string;
  reportedMediaId?: string;
  decision?: string;
  decisionReason?: string;
  decidedAt?: string;
  decidedBy?: string;
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';
export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type DeletedStatus = 'none' | 'deleted_for_me' | 'deleted_for_everyone';

export type TapType = 'HOT' | 'WOOF' | 'BOLT' | 'WAVE';

export type MessageType = 'TEXT' | 'PHOTO' | 'LINK' | 'LOCATION' | 'STICKER' | 'VOICE' | 'STAR_VIDEO' | 'TAP' | 'VAULT_ACTION';

// Specific typed message payloads (Section 1)
export interface PhotoPayload {
  mediaId: string;
  thumbnailRef?: string;
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
  caption?: string;
}

export interface LinkPayload {
  normalizedUrl: string;
  displayUrl: string;
  title?: string;
  domain: string;
  thumbnailRef?: string;
  description?: string;
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  label?: string;
  placeName?: string;
  precisionMode: 'exact' | 'approximate';
  createdAt: string;
  expiresAt?: string;
}

export interface StickerPayload {
  stickerId: string;
  stickerPackId: string;
  animated?: boolean;
  name?: string;
  url?: string;
}

export interface VoicePayload {
  mediaId: string;
  duration: number; // in seconds
  mimeType: string;
  size: number;
  waveform?: number[];
}

export interface StarVideoPayload {
  mediaId: string;
  thumbnailRef?: string;
  duration: number; // strict limit, max 20s
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
}

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
  clientMessageId?: string; // Idempotency key for message delivery
  conversationId: string;
  senderId: string;
  receiverId: string;
  recipientId?: string; // conversation membership reference / synonym
  type: MessageType;
  createdAt: string;
  updatedAt?: string;

  // Delivery & Read Status
  status: MessageStatus; // backwards compatible
  deliveryStatus?: DeliveryStatus;
  readStatus?: boolean;
  readAt?: string;
  deletedStatus?: DeletedStatus;
  deletedForUserIds?: string[];

  // Typed Media Payloads
  photo?: PhotoPayload;
  link?: LinkPayload;
  locationPayload?: LocationPayload;
  stickerPayload?: StickerPayload;
  voice?: VoicePayload;
  starVideo?: StarVideoPayload;

  // Legacy / Existing fields for backwards compatibility
  text?: string;
  photoUrl?: string;
  media?: MessageMediaInfo;
  linkPreview?: LinkPreviewInfo;
  location?: LocationInfo;
  stickerId?: string;
  stickerUrl?: string;
  stickerName?: string;
  tapType?: TapType;
  vaultAction?: 'REQUEST' | 'GRANT' | 'REVOKE';
  expiresAt?: string;
  ttlSeconds?: number;
  isPermanent?: boolean;
  excludeFromBackup?: boolean;
  disableAutoBackup?: boolean;
}

export interface ConversationSettings {
  messageTtlSeconds?: number | null;
  excludeFromBackup?: boolean;
  disableAutoBackup?: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  otherParticipant: UserProfile;
  messageTtlSeconds?: number; // 0 or undefined = forever; 30, 300, 3600, 86400, 604800
  excludeFromBackup?: boolean; // off-the-record / exclude from cloud backup
  disableAutoBackup?: boolean; // opt-out from cloud backup, store only locally
  vaultAccessGranted?: boolean; // current user granted their vault to other
  vaultAccessReceived?: boolean; // other user granted their vault to current user
  vaultRequested?: boolean; // current user requested other's vault
  settings?: ConversationSettings;
  createdAt?: string;
  updatedAt?: string;
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
  rightNowOnly?: boolean;
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
  isSensitive?: boolean;
  isBlurred?: boolean;
  moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
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
  safeContentEnabled?: boolean; // Safe Content setting: sexual/sensitive content blurred/hidden by default
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

export interface CloudBackupRecord {
  backupId: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  totalConversations: number;
  backedUpConversations: number;
  excludedConversations: number;
  excludedDueToDisableAutoBackup: number;
  totalMessagesBackedUp: number;
  checksumSha256: string;
  backupSizeBytes?: number;
  backupFilePath?: string;
  automated: boolean;
  excludedConversationIds: string[];
}

export interface CloudBackupStatus {
  serviceActive: boolean;
  lastBackup: CloudBackupRecord | null;
  totalConversations: number;
  conversationsWithAutoBackupDisabled: number;
  historyCount: number;
  nextScheduledBackup?: string;
}

// ==========================================
// UNIFIED BILLING & ENTITLEMENTS (STORE-READY)
// ==========================================

export type BillingProviderType = 'google_play' | 'apple_storekit' | 'stripe' | 'none';

export type EntitlementStatus = 
  | 'active' 
  | 'grace_period' 
  | 'account_hold' 
  | 'canceled' 
  | 'expired' 
  | 'revoked' 
  | 'none';

export type PlanTier = 'monthly' | 'three_month' | 'yearly';

export interface UserEntitlement {
  userId: string;
  premium: boolean;
  provider: BillingProviderType;
  productId?: string;
  planTier?: PlanTier;
  status: EntitlementStatus;
  expiresAt?: string;
  autoRenew: boolean;
  originalTransactionId?: string;
  purchaseTokenHash?: string;
  storeTransactionId?: string;
  environment?: 'production' | 'sandbox';
  gracePeriodUntil?: string;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreProduct {
  id: string;
  tier: PlanTier;
  title: string;
  description: string;
  localizedPrice: string;
  priceAmountMicros?: number;
  currencyCode?: string;
  billingPeriod: 'P1M' | 'P3M' | 'P1Y';
  freeTrialPeriod?: string;
}

