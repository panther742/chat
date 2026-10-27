import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  encryptProtectedMessage,
  decryptProtectedMessage,
  filterActiveStories,
  computeStoryExpiryIso,
  hasMinimumCommunityRole,
  canMemberAccessChannel,
  toggleUniqueId,
  sanitizeFilename,
  validateMediaUpload,
  filterAndRankFeed,
} from './domainLogic';
import type { CommunityServer, SocialPost, StoryItem } from '../types/platform';

test('password hashing and timing-safe verification succeed on valid password and reject wrong password', () => {
  const { hashHex, saltHex } = hashPassword('CorrectHorseBatteryStaple!');
  assert.equal(verifyPassword('CorrectHorseBatteryStaple!', hashHex, saltHex), true);
  assert.equal(verifyPassword('WrongPassword123', hashHex, saltHex), false);
});

test('password-protected message AES-256-GCM encryption and decryption roundtrip', () => {
  const payload = encryptProtectedMessage('Launch coordinates: 42.3601 N', 'nebula-key', 'Star cluster');
  assert.equal(payload.hint, 'Star cluster');
  assert.equal(decryptProtectedMessage(payload, 'wrong-key'), null);
  assert.equal(decryptProtectedMessage(payload, 'nebula-key'), 'Launch coordinates: 42.3601 N');
});

test('24-hour Story expiry filters out expired stories while preserving active stories', () => {
  const now = Date.now();
  const activeStory: StoryItem = {
    id: 'st-1',
    authorId: 'u-1',
    mediaUrl: 'data:image/svg+xml;utf8,<svg></svg>',
    mediaType: 'image',
    caption: 'Active story',
    createdAt: new Date(now - 2 * 3600 * 1000).toISOString(),
    expiresAt: computeStoryExpiryIso(now - 2 * 3600 * 1000, 24),
    viewerIds: [],
  };
  const expiredStory: StoryItem = {
    id: 'st-2',
    authorId: 'u-1',
    mediaUrl: 'data:image/svg+xml;utf8,<svg></svg>',
    mediaType: 'image',
    caption: 'Expired 25h ago',
    createdAt: new Date(now - 25 * 3600 * 1000).toISOString(),
    expiresAt: computeStoryExpiryIso(now - 25 * 3600 * 1000, 24),
    viewerIds: [],
  };

  const result = filterActiveStories([activeStory, expiredStory], now);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'st-1');
});

test('Discord-style role hierarchy and channel access control enforce membership, bans, and role minimums', () => {
  assert.equal(hasMinimumCommunityRole('owner', 'admin'), true);
  assert.equal(hasMinimumCommunityRole('member', 'moderator'), false);

  const server: CommunityServer = {
    id: 'srv-1',
    name: 'Synth Architects',
    description: 'Audio & hardware design',
    iconText: 'SA',
    accentColor: '#6366F1',
    ownerId: 'u-owner',
    isPrivate: false,
    createdAt: new Date().toISOString(),
    categories: ['GENERAL'],
    channels: [
      {
        id: 'ch-announcements',
        communityId: 'srv-1',
        category: 'GENERAL',
        name: 'announcements',
        topic: 'Official updates',
        type: 'announcement',
        permissions: { minRoleToRead: 'member', minRoleToWrite: 'moderator' },
        pinnedMessageIds: [],
      },
    ],
    members: [
      { userId: 'u-owner', role: 'owner', joinedAt: new Date().toISOString() },
      { userId: 'u-member', role: 'member', joinedAt: new Date().toISOString() },
    ],
    bannedUserIds: ['u-banned'],
    invites: [],
  };

  const channel = server.channels[0];
  assert.equal(canMemberAccessChannel(server, channel, 'u-owner', 'write'), true);
  assert.equal(canMemberAccessChannel(server, channel, 'u-member', 'read'), true);
  assert.equal(canMemberAccessChannel(server, channel, 'u-member', 'write'), false);
  assert.equal(canMemberAccessChannel(server, channel, 'u-banned', 'read'), false);
});

test('duplicate-free toggleUniqueId prevents duplicate likes or bookmarks', () => {
  const step1 = toggleUniqueId(['u-1'], 'u-2');
  assert.deepEqual(step1.next, ['u-1', 'u-2']);
  assert.equal(step1.added, true);

  const step2 = toggleUniqueId(step1.next, 'u-2');
  assert.deepEqual(step2.next, ['u-1']);
  assert.equal(step2.added, false);
});

test('media upload validation sanitizes path traversal filenames and rejects executable magic bytes', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd');
  const blockedExec = validateMediaUpload({
    filename: 'malware.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 1024,
    maxSizeMb: 25,
    allowedMimeTypes: ['video/mp4'],
    headerHex: '7f454c4602010100', // ELF binary disguised as mp4
  });
  assert.equal(blockedExec.valid, false);

  const validImg = validateMediaUpload({
    filename: 'studio shot.png',
    mimeType: 'image/png',
    sizeBytes: 204800,
    maxSizeMb: 25,
    allowedMimeTypes: ['image/png'],
    headerHex: '89504e470d0a1a0a',
  });
  assert.equal(validImg.valid, true);
  assert.equal(validImg.safeFilename, 'studio_shot.png');
});

test('unified and mode-specific feed filtering respects blocks, followed users, and joined communities', () => {
  const now = Date.now();
  const posts: SocialPost[] = [
    {
      id: 'p-1',
      authorId: 'u-followed',
      caption: 'Followed creator post',
      mediaUrls: [],
      mediaType: 'text',
      tags: ['design'],
      likes: ['u-1'],
      comments: [],
      createdAt: new Date(now - 10000).toISOString(),
    },
    {
      id: 'p-2',
      authorId: 'u-blocked',
      caption: 'Should never appear',
      mediaUrls: [],
      mediaType: 'text',
      tags: ['design'],
      likes: [],
      comments: [],
      createdAt: new Date(now - 5000).toISOString(),
    },
    {
      id: 'p-3',
      authorId: 'u-other',
      caption: 'Community linked post',
      mediaUrls: [],
      mediaType: 'text',
      tags: ['synth'],
      likes: [],
      comments: [],
      createdAt: new Date(now - 2000).toISOString(),
      linkedCommunityId: 'srv-1',
    },
  ];

  const unified = filterAndRankFeed({
    posts,
    viewerId: 'u-me',
    followingIds: ['u-followed'],
    joinedCommunityIds: ['srv-1'],
    blockedUserIds: ['u-blocked'],
    mode: 'unified',
  });
  assert.equal(unified.length, 2);
  assert.equal(unified.some((p) => p.id === 'p-2'), false);

  const commOnly = filterAndRankFeed({
    posts,
    viewerId: 'u-me',
    followingIds: ['u-followed'],
    joinedCommunityIds: ['srv-1'],
    blockedUserIds: ['u-blocked'],
    mode: 'communities',
  });
  assert.equal(commOnly.length, 1);
  assert.equal(commOnly[0].id, 'p-3');
});
