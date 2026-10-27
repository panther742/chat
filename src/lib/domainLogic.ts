import crypto from 'node:crypto';
import type {
  CommunityRole,
  SocialPost,
  StoryItem,
  CommunityServer,
  CommunityChannel,
} from '../types/platform';

const ROLE_WEIGHT: Record<CommunityRole, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

/**
 * Hashes a user password with a random 16-byte salt using PBKDF2-HMAC-SHA256.
 */
export function hashPassword(password: string, saltHex?: string): { hashHex: string; saltHex: string } {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256');
  return {
    hashHex: derived.toString('hex'),
    saltHex: salt.toString('hex'),
  };
}

/**
 * Timing-safe password verification.
 */
export function verifyPassword(password: string, storedHashHex: string, storedSaltHex: string): boolean {
  if (!password || !storedHashHex || !storedSaltHex) return false;
  try {
    const { hashHex } = hashPassword(password, storedSaltHex);
    const a = Buffer.from(hashHex, 'hex');
    const b = Buffer.from(storedHashHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Encrypts a password-protected message using AES-256-GCM with a PBKDF2-derived key.
 * Distinguishes message-level passphrase encryption from account authentication.
 */
export function encryptProtectedMessage(
  plaintext: string,
  passphrase: string,
  hint?: string
): {
  ciphertextHex: string;
  saltHex: string;
  ivHex: string;
  hint?: string;
} {
  if (!plaintext.trim()) {
    throw new Error('Message content cannot be empty.');
  }
  if (!passphrase || passphrase.length < 3) {
    throw new Error('Message passphrase must be at least 3 characters.');
  }
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passphrase, salt, 50_000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, authTag]);
  return {
    ciphertextHex: combined.toString('hex'),
    saltHex: salt.toString('hex'),
    ivHex: iv.toString('hex'),
    hint: hint?.trim() || undefined,
  };
}

/**
 * Decrypts a password-protected message payload using the supplied passphrase.
 */
export function decryptProtectedMessage(
  payload: { ciphertextHex: string; saltHex: string; ivHex: string },
  passphrase: string
): string | null {
  try {
    const salt = Buffer.from(payload.saltHex, 'hex');
    const iv = Buffer.from(payload.ivHex, 'hex');
    const combined = Buffer.from(payload.ciphertextHex, 'hex');
    if (combined.length < 16) return null;
    const ciphertext = combined.subarray(0, combined.length - 16);
    const authTag = combined.subarray(combined.length - 16);
    const key = crypto.pbkdf2Sync(passphrase, salt, 50_000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Filters Stories strictly by the 24-hour expiry rule.
 * Never affects posts, servers, channels, or user accounts.
 */
export function filterActiveStories(stories: StoryItem[], nowMs: number = Date.now()): StoryItem[] {
  return stories.filter((story) => {
    const expiresMs = new Date(story.expiresAt).getTime();
    return Number.isFinite(expiresMs) && expiresMs > nowMs;
  });
}

/**
 * Computes the 24-hour expiration timestamp for a newly created Story.
 */
export function computeStoryExpiryIso(createdAtMs: number = Date.now(), expiryHours = 24): string {
  return new Date(createdAtMs + expiryHours * 60 * 60 * 1000).toISOString();
}

/**
 * Role hierarchy comparison for Discord-style community permissions.
 */
export function hasMinimumCommunityRole(actualRole: CommunityRole | null | undefined, requiredRole: CommunityRole): boolean {
  if (!actualRole) return false;
  return ROLE_WEIGHT[actualRole] >= ROLE_WEIGHT[requiredRole];
}

export function canMemberAccessChannel(
  server: CommunityServer,
  channel: CommunityChannel,
  userId: string,
  mode: 'read' | 'write'
): boolean {
  if (server.bannedUserIds.includes(userId)) return false;
  const member = server.members.find((m) => m.userId === userId);
  if (!member) {
    // Public servers allow read preview only if not private, but never write without membership
    if (mode === 'read' && !server.isPrivate && channel.permissions.minRoleToRead === 'member') {
      return true;
    }
    return false;
  }
  if (mode === 'write' && member.mutedUntil) {
    const mutedUntilMs = new Date(member.mutedUntil).getTime();
    if (Number.isFinite(mutedUntilMs) && mutedUntilMs > Date.now()) {
      return false;
    }
  }
  const required = mode === 'write' ? channel.permissions.minRoleToWrite : channel.permissions.minRoleToRead;
  return hasMinimumCommunityRole(member.role, required);
}

/**
 * Prevents duplicate IDs in likes, saves, followers, or reaction arrays.
 */
export function toggleUniqueId(list: string[], id: string): { next: string[]; added: boolean } {
  const exists = list.includes(id);
  if (exists) {
    return { next: list.filter((item) => item !== id), added: false };
  }
  return { next: [...list, id], added: true };
}

/**
 * Sanitizes filenames to prevent path traversal or unsafe shell/filesystem characters.
 */
export function sanitizeFilename(rawName: string): string {
  const base = rawName.split(/[/\\]/).pop() || 'upload';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
  return cleaned.slice(0, 96) || 'upload_asset';
}

/**
 * Validates file upload size, MIME type, and optional magic-byte header signature.
 */
export function validateMediaUpload(params: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  maxSizeMb: number;
  allowedMimeTypes: string[];
  headerHex?: string;
}): { valid: boolean; error?: string; safeFilename: string } {
  const safeFilename = sanitizeFilename(params.filename);
  const maxBytes = params.maxSizeMb * 1024 * 1024;
  if (params.sizeBytes <= 0) {
    return { valid: false, error: 'Uploaded file is empty.', safeFilename };
  }
  if (params.sizeBytes > maxBytes) {
    return {
      valid: false,
      error: `File exceeds maximum size limit of ${params.maxSizeMb} MB.`,
      safeFilename,
    };
  }
  if (!params.allowedMimeTypes.includes(params.mimeType)) {
    return {
      valid: false,
      error: `Unsupported media format (${params.mimeType}).`,
      safeFilename,
    };
  }
  if (params.headerHex) {
    const lowerHex = params.headerHex.toLowerCase();
    // Reject executable signatures (MZ / ELF / Mach-O / shebang)
    if (
      lowerHex.startsWith('4d5a') || // Windows PE
      lowerHex.startsWith('7f454c46') || // Linux ELF
      lowerHex.startsWith('2321') // #! script
    ) {
      return {
        valid: false,
        error: 'Executable files are strictly prohibited.',
        safeFilename,
      };
    }
  }
  return { valid: true, safeFilename };
}

/**
 * Ranks and filters posts according to the user's selected feed mode:
 * - 'unified': Combines posts from followed creators, joined communities, and high-signal public posts.
 * - 'following': Only posts authored by followed users (plus own posts).
 * - 'communities': Only posts cross-linked to communities the user has joined.
 * - 'latest': Pure reverse-chronological feed of accessible posts.
 */
export function filterAndRankFeed(params: {
  posts: SocialPost[];
  viewerId: string;
  followingIds: string[];
  joinedCommunityIds: string[];
  blockedUserIds: string[];
  mode: 'unified' | 'following' | 'communities' | 'latest';
  tagFilter?: string;
  searchQuery?: string;
}): SocialPost[] {
  const {
    posts,
    viewerId,
    followingIds,
    joinedCommunityIds,
    blockedUserIds,
    mode,
    tagFilter,
    searchQuery,
  } = params;

  const visible = posts.filter((post) => {
    if (blockedUserIds.includes(post.authorId)) return false;
    if (tagFilter && tagFilter !== 'all' && !post.tags.includes(tagFilter)) return false;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const inCaption = post.caption.toLowerCase().includes(q);
      const inTags = post.tags.some((t) => t.toLowerCase().includes(q));
      if (!inCaption && !inTags) return false;
    }
    if (mode === 'following') {
      return post.authorId === viewerId || followingIds.includes(post.authorId);
    }
    if (mode === 'communities') {
      return Boolean(post.linkedCommunityId && joinedCommunityIds.includes(post.linkedCommunityId));
    }
    return true;
  });

  if (mode === 'latest' || mode === 'following' || mode === 'communities') {
    return [...visible].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Unified mode: transparent, deterministic score combining recency + relationship + community membership
  return [...visible].sort((a, b) => {
    const score = (p: SocialPost) => {
      const ageHours = Math.max(0, (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60));
      const recencyBoost = Math.max(0, 48 - ageHours);
      const followBoost = p.authorId === viewerId || followingIds.includes(p.authorId) ? 20 : 0;
      const communityBoost =
        p.linkedCommunityId && joinedCommunityIds.includes(p.linkedCommunityId) ? 18 : 0;
      const engagementBoost = Math.min(25, p.likes.length * 2 + p.comments.length * 3);
      return recencyBoost + followBoost + communityBoost + engagementBoost;
    };
    return score(b) - score(a);
  });
}
