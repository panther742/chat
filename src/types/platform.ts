export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member';

export type PlatformRole = 'user' | 'moderator' | 'admin';

export interface NotificationPreferences {
  directMessages: boolean;
  mentionsAndReplies: boolean;
  likesAndComments: boolean;
  newFollowers: boolean;
  communityInvites: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerColor: string;
  isPrivate: boolean;
  platformRole: PlatformRole;
  suspended?: boolean;
  createdAt: string;
  followers: string[]; // user IDs
  following: string[]; // user IDs
  blockedUsers: string[]; // user IDs
  savedPostIds: string[];
  savedReelIds: string[];
  notificationPrefs: NotificationPreferences;
  statusText?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  likes: string[];
}

export interface SocialPost {
  id: string;
  authorId: string;
  caption: string;
  mediaUrls: string[];
  mediaType: 'text' | 'image' | 'gallery';
  tags: string[];
  likes: string[]; // user IDs
  comments: PostComment[];
  createdAt: string;
  updatedAt?: string;
  // Original feature: Community-Linked Post & Collaborative Channel Bridge
  linkedCommunityId?: string;
  linkedChannelId?: string;
  // Original feature: Temporary Pulse Room ID attached to post
  pulseRoomId?: string;
}

export interface StoryItem {
  id: string;
  authorId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  createdAt: string;
  expiresAt: string; // Strictly 24 hours after createdAt
  viewerIds: string[];
  accentColor?: string;
}

export interface ReelComment {
  id: string;
  reelId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ReelItem {
  id: string;
  authorId: string;
  caption: string;
  videoUrl: string;
  visualPreset: 'cyber_grid' | 'synth_waves' | 'aurora_pulse' | 'uploaded_video';
  durationSec: number;
  likes: string[];
  comments: ReelComment[];
  audioTrackTitle: string;
  createdAt: string;
  linkedCommunityId?: string;
  pulseRoomId?: string;
}

export interface ChannelPermissionOverride {
  minRoleToWrite: CommunityRole;
  minRoleToRead: CommunityRole;
}

export interface CommunityChannel {
  id: string;
  communityId: string;
  category: string;
  name: string;
  topic: string;
  type: 'text' | 'voice' | 'announcement';
  permissions: ChannelPermissionOverride;
  pinnedMessageIds: string[];
}

export interface CommunityMember {
  userId: string;
  role: CommunityRole;
  joinedAt: string;
  mutedUntil?: string;
}

export interface CommunityInvite {
  code: string;
  communityId: string;
  createdBy: string;
  createdAt: string;
  uses: number;
  revoked: boolean;
}

export interface CommunityServer {
  id: string;
  name: string;
  description: string;
  iconText: string;
  accentColor: string;
  ownerId: string;
  isPrivate: boolean;
  createdAt: string;
  categories: string[];
  channels: CommunityChannel[];
  members: CommunityMember[];
  bannedUserIds: string[];
  invites: CommunityInvite[];
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  channelId?: string; // For server channel messages
  communityId?: string;
  threadId?: string; // For DM or Group Chat threads
  pulseRoomId?: string; // For temporary post/reel Pulse Rooms
  authorId: string;
  content: string; // Plaintext or "[Password-Protected Message]" placeholder when locked
  isPasswordProtected: boolean;
  encryptedPayload?: {
    ciphertextHex: string;
    saltHex: string;
    ivHex: string;
    hint?: string;
  };
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file';
  attachmentName?: string;
  replyToMessageId?: string;
  reactions: MessageReaction[];
  isPinned?: boolean;
  editedAt?: string;
  createdAt: string;
}

export interface DirectMessageThread {
  id: string;
  isGroup: boolean;
  name?: string;
  participantIds: string[];
  createdAt: string;
  lastMessageAt: string;
  unreadBy: Record<string, number>; // userId -> unread count
  readReceipts: Record<string, string>; // userId -> ISO timestamp
}

export interface PulseRoom {
  id: string;
  title: string;
  hostUserId: string;
  attachedPostId?: string;
  attachedReelId?: string;
  activeParticipantIds: string[];
  createdAt: string;
  expiresAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // Recipient
  actorId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'dm' | 'invite' | 'system';
  title: string;
  body: string;
  targetView?: string;
  targetId?: string;
  read: boolean;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  targetType: 'user' | 'post' | 'reel' | 'message' | 'community';
  targetId: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  communityId?: string;
  action: string;
  targetId?: string;
  metadataSummary: string;
  createdAt: string;
}
