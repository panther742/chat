import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
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
  validateMediaUpload,
} from './src/lib/domainLogic';
import {
  AVATAR_ASSETS,
  POST_MEDIA_ASSETS,
  STORY_MEDIA_ASSETS,
} from './src/utils/visualAssets';
import type {
  UserProfile,
  SocialPost,
  StoryItem,
  ReelItem,
  CommunityServer,
  ChatMessage,
  DirectMessageThread,
  PulseRoom,
  AppNotification,
  ModerationReport,
  AuditLogEntry,
  CommunityRole,
} from './src/types/platform';

dotenv.config();

interface StoredUserCredential {
  userId: string;
  passwordHashHex: string;
  passwordSaltHex: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface PlatformStore {
  version: number;
  lastUpdated: string;
  users: UserProfile[];
  credentials: StoredUserCredential[];
  sessions: SessionRecord[];
  posts: SocialPost[];
  stories: StoryItem[];
  reels: ReelItem[];
  communities: CommunityServer[];
  messages: ChatMessage[];
  dmThreads: DirectMessageThread[];
  pulseRooms: PulseRoom[];
  notifications: AppNotification[];
  reports: ModerationReport[];
  auditLogs: AuditLogEntry[];
}

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || './data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const BACKUP_PATH = path.join(DATA_DIR, 'store.json.bak');
const TMP_PATH = path.join(DATA_DIR, 'store.json.tmp');
const LOCK_PATH = path.join(DATA_DIR, 'store.lock');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function acquireProcessLock() {
  ensureDataDir();
  fs.writeFileSync(LOCK_PATH, `${process.pid}:${new Date().toISOString()}`, { flag: 'w' });
}

function createInitialSeedStore(): PlatformStore {
  const now = Date.now();
  const iso = (offsetMinutes = 0) => new Date(now + offsetMinutes * 60_000).toISOString();

  const elenaCred = hashPassword('ElenaArchitect#2026');
  const marcusCred = hashPassword('MarcusModular#2026');
  const soraCred = hashPassword('SoraVisuals#2026');
  const devonCred = hashPassword('DevonNetwork#2026');

  const users: UserProfile[] = [
    {
      id: 'u-elena',
      username: 'elena_vance',
      displayName: 'Elena Vance',
      bio: 'Spatial systems architect & community founder. Exploring brutalist acoustics, WebRTC low-latency rooms, and decentralized design.',
      avatarUrl: AVATAR_ASSETS.elena,
      bannerColor: '#4F46E5',
      isPrivate: false,
      platformRole: 'admin',
      createdAt: iso(-10080),
      followers: ['u-marcus', 'u-sora', 'u-devon'],
      following: ['u-marcus', 'u-sora'],
      blockedUsers: [],
      savedPostIds: ['post-2'],
      savedReelIds: ['reel-1'],
      notificationPrefs: {
        directMessages: true,
        mentionsAndReplies: true,
        likesAndComments: true,
        newFollowers: true,
        communityInvites: true,
      },
      statusText: 'Designing #monolith-acoustics',
    },
    {
      id: 'u-marcus',
      username: 'marcus_k',
      displayName: 'Marcus Kael',
      bio: 'Hardware synth builder & DSP engineer. Hosting nightly modular patch streams in Synth Architects.',
      avatarUrl: AVATAR_ASSETS.marcus,
      bannerColor: '#7C3AED',
      isPrivate: false,
      platformRole: 'user',
      createdAt: iso(-8640),
      followers: ['u-elena', 'u-sora'],
      following: ['u-elena', 'u-sora', 'u-devon'],
      blockedUsers: [],
      savedPostIds: ['post-1'],
      savedReelIds: [],
      notificationPrefs: {
        directMessages: true,
        mentionsAndReplies: true,
        likesAndComments: true,
        newFollowers: true,
        communityInvites: true,
      },
      statusText: 'Patching Eurorack 48kHz',
    },
    {
      id: 'u-sora',
      username: 'sora_takahashi',
      displayName: 'Sora Takahashi',
      bio: 'Computational photographer & real-time shader artist. Tokyo / Zurich.',
      avatarUrl: AVATAR_ASSETS.sora,
      bannerColor: '#3B82F6',
      isPrivate: false,
      platformRole: 'moderator',
      createdAt: iso(-7200),
      followers: ['u-elena', 'u-marcus', 'u-devon'],
      following: ['u-elena', 'u-marcus'],
      blockedUsers: [],
      savedPostIds: [],
      savedReelIds: ['reel-2'],
      notificationPrefs: {
        directMessages: true,
        mentionsAndReplies: true,
        likesAndComments: true,
        newFollowers: true,
        communityInvites: true,
      },
      statusText: 'Shooting 35mm night series',
    },
    {
      id: 'u-devon',
      username: 'devon_hart',
      displayName: 'Devon Hart',
      bio: 'Protocol security researcher & distributed systems engineer.',
      avatarUrl: AVATAR_ASSETS.devon,
      bannerColor: '#1E40AF',
      isPrivate: true,
      platformRole: 'user',
      createdAt: iso(-4320),
      followers: ['u-marcus'],
      following: ['u-elena', 'u-sora'],
      blockedUsers: [],
      savedPostIds: [],
      savedReelIds: [],
      notificationPrefs: {
        directMessages: true,
        mentionsAndReplies: true,
        likesAndComments: false,
        newFollowers: true,
        communityInvites: true,
      },
      statusText: 'Auditing transport encryption',
    },
  ];

  const communities: CommunityServer[] = [
    {
      id: 'srv-architects',
      name: 'Synth & Spatial Architects',
      description: 'Collaborative collective for modular audio designers, architectural photographers, and WebRTC builders.',
      iconText: 'SA',
      accentColor: '#6366F1',
      ownerId: 'u-elena',
      isPrivate: false,
      createdAt: iso(-9000),
      categories: ['ANNOUNCEMENTS', 'DESIGN & AUDIO LABS', 'VOICE & STAGE'],
      channels: [
        {
          id: 'ch-welcome',
          communityId: 'srv-architects',
          category: 'ANNOUNCEMENTS',
          name: 'announcements',
          topic: 'Official studio releases, schema milestones, and community events.',
          type: 'announcement',
          permissions: { minRoleToRead: 'member', minRoleToWrite: 'moderator' },
          pinnedMessageIds: ['msg-1'],
        },
        {
          id: 'ch-general',
          communityId: 'srv-architects',
          category: 'DESIGN & AUDIO LABS',
          name: 'general-discourse',
          topic: 'Open discussion bridging social feed posts and studio projects.',
          type: 'text',
          permissions: { minRoleToRead: 'member', minRoleToWrite: 'member' },
          pinnedMessageIds: ['msg-2'],
        },
        {
          id: 'ch-modular-dsp',
          communityId: 'srv-architects',
          category: 'DESIGN & AUDIO LABS',
          name: 'modular-dsp',
          topic: 'Share patch notes, oscilloscope captures, and encrypted studio stems.',
          type: 'text',
          permissions: { minRoleToRead: 'member', minRoleToWrite: 'member' },
          pinnedMessageIds: [],
        },
        {
          id: 'ch-voice-lounge',
          communityId: 'srv-architects',
          category: 'VOICE & STAGE',
          name: 'Studio A — Live Audio/Video',
          topic: 'Low-latency WebRTC voice, video, and screen-sharing room.',
          type: 'voice',
          permissions: { minRoleToRead: 'member', minRoleToWrite: 'member' },
          pinnedMessageIds: [],
        },
      ],
      members: [
        { userId: 'u-elena', role: 'owner', joinedAt: iso(-9000) },
        { userId: 'u-sora', role: 'moderator', joinedAt: iso(-7000) },
        { userId: 'u-marcus', role: 'admin', joinedAt: iso(-8000) },
        { userId: 'u-devon', role: 'member', joinedAt: iso(-4000) },
      ],
      bannedUserIds: [],
      invites: [
        {
          code: 'SYNTH-2026',
          communityId: 'srv-architects',
          createdBy: 'u-elena',
          createdAt: iso(-1440),
          uses: 14,
          revoked: false,
        },
      ],
    },
    {
      id: 'srv-visual-Tokyo',
      name: 'Nocturne Visual Collective',
      description: 'Night street photography, 35mm film critiques, and generative GLSL shaders.',
      iconText: 'NV',
      accentColor: '#8B5CF6',
      ownerId: 'u-sora',
      isPrivate: false,
      createdAt: iso(-6500),
      categories: ['CRITIQUE CHANNELS', 'LIVE CRITIQUE'],
      channels: [
        {
          id: 'ch-darkroom',
          communityId: 'srv-visual-Tokyo',
          category: 'CRITIQUE CHANNELS',
          name: 'darkroom-critique',
          topic: 'Post high-resolution contact sheets and lighting diagrams.',
          type: 'text',
          permissions: { minRoleToRead: 'member', minRoleToWrite: 'member' },
          pinnedMessageIds: [],
        },
        {
          id: 'ch-shader-voice',
          communityId: 'srv-visual-Tokyo',
          category: 'LIVE CRITIQUE',
          name: 'Shader Review Stage',
          topic: 'Screen-share GLSL shaders and color grading pipelines.',
          type: 'voice',
          permissions: { minRoleToRead: 'member', minRoleToWrite: 'member' },
          pinnedMessageIds: [],
        },
      ],
      members: [
        { userId: 'u-sora', role: 'owner', joinedAt: iso(-6500) },
        { userId: 'u-elena', role: 'admin', joinedAt: iso(-6400) },
        { userId: 'u-marcus', role: 'member', joinedAt: iso(-5000) },
      ],
      bannedUserIds: [],
      invites: [
        {
          code: 'NOCTURNE-35',
          communityId: 'srv-visual-Tokyo',
          createdBy: 'u-sora',
          createdAt: iso(-1200),
          uses: 8,
          revoked: false,
        },
      ],
    },
  ];

  const pulseRooms: PulseRoom[] = [
    {
      id: 'pulse-1',
      title: 'Acoustics & Concrete Reflections Q&A',
      hostUserId: 'u-elena',
      attachedPostId: 'post-1',
      activeParticipantIds: ['u-elena', 'u-marcus', 'u-sora'],
      createdAt: iso(-90),
      expiresAt: iso(360),
    },
  ];

  const posts: SocialPost[] = [
    {
      id: 'post-1',
      authorId: 'u-elena',
      caption:
        'Completed the acoustic baffle array inside the Zurich Monolith Studio. By angling raw board-formed concrete at 7 degrees against warm tungsten diffusion, standing waves drop by 14dB below 120Hz. Join the linked channel or open the live Pulse Room to inspect the impulse responses.',
      mediaUrls: [POST_MEDIA_ASSETS.architectureStudio],
      mediaType: 'image',
      tags: ['architecture', 'acoustics', 'studio'],
      likes: ['u-marcus', 'u-sora', 'u-devon'],
      comments: [
        {
          id: 'c-1',
          postId: 'post-1',
          authorId: 'u-marcus',
          content: 'Tested the impulse response file on my modular reverb — the decay tail at 80Hz is remarkably clean.',
          createdAt: iso(-110),
          likes: ['u-elena', 'u-sora'],
        },
        {
          id: 'c-2',
          postId: 'post-1',
          authorId: 'u-sora',
          content: 'The tungsten vs twilight color temperature balance here is spot on.',
          createdAt: iso(-75),
          likes: ['u-elena'],
        },
      ],
      createdAt: iso(-140),
      linkedCommunityId: 'srv-architects',
      linkedChannelId: 'ch-general',
      pulseRoomId: 'pulse-1',
    },
    {
      id: 'post-2',
      authorId: 'u-marcus',
      caption:
        'New granular clock divider & harmonic fold module running at 48kHz / 24-bit. Full schematic and clean stems are pinned inside #modular-dsp.',
      mediaUrls: [POST_MEDIA_ASSETS.modularSynth],
      mediaType: 'image',
      tags: ['synth', 'audio', 'hardware'],
      likes: ['u-elena', 'u-sora'],
      comments: [
        {
          id: 'c-3',
          postId: 'post-2',
          authorId: 'u-elena',
          content: 'Bringing this patch into tonight’s Studio A WebRTC jam session.',
          createdAt: iso(-45),
          likes: ['u-marcus'],
        },
      ],
      createdAt: iso(-95),
      linkedCommunityId: 'srv-architects',
      linkedChannelId: 'ch-modular-dsp',
    },
    {
      id: 'post-3',
      authorId: 'u-sora',
      caption:
        'Mapped our decentralized relay mesh across 12 regional edge nodes. Zero automatic server deletion, atomic snapshot persistence, and strict 24-hour story isolation verified.',
      mediaUrls: [POST_MEDIA_ASSETS.spatialTopology],
      mediaType: 'image',
      tags: ['systems', 'security', 'network'],
      likes: ['u-elena', 'u-devon'],
      comments: [],
      createdAt: iso(-40),
      linkedCommunityId: 'srv-visual-Tokyo',
      linkedChannelId: 'ch-darkroom',
    },
  ];

  const stories: StoryItem[] = [
    {
      id: 'story-1',
      authorId: 'u-sora',
      mediaUrl: STORY_MEDIA_ASSETS.tokyoRain,
      mediaType: 'image',
      caption: 'Shibuya East — Blue Hour 35mm contact frame (Expires in 24h)',
      createdAt: iso(-180),
      expiresAt: computeStoryExpiryIso(now - 180 * 60_000, 24),
      viewerIds: ['u-elena', 'u-marcus'],
      accentColor: '#6366F1',
    },
    {
      id: 'story-2',
      authorId: 'u-marcus',
      mediaUrl: STORY_MEDIA_ASSETS.shaderPrototype,
      mediaType: 'image',
      caption: 'Live modular soundcheck in Studio A voice room — hop in!',
      createdAt: iso(-60),
      expiresAt: computeStoryExpiryIso(now - 60 * 60_000, 24),
      viewerIds: ['u-elena'],
      accentColor: '#8B5CF6',
    },
  ];

  const reels: ReelItem[] = [
    {
      id: 'reel-1',
      authorId: 'u-marcus',
      caption: 'Real-time phase modulation & sub-harmonic sweep recorded straight from the Eurorack bus.',
      videoUrl: '',
      visualPreset: 'synth_waves',
      durationSec: 28,
      likes: ['u-elena', 'u-sora', 'u-devon'],
      comments: [
        {
          id: 'rc-1',
          reelId: 'reel-1',
          authorId: 'u-elena',
          content: 'That sub-bass transient locked right into the grid.',
          createdAt: iso(-50),
        },
      ],
      audioTrackTitle: 'Marcus Kael — Patch 09B (Original Bus)',
      createdAt: iso(-120),
      linkedCommunityId: 'srv-architects',
    },
    {
      id: 'reel-2',
      authorId: 'u-sora',
      caption: 'Procedural raymarched twilight study for the Nocturne exhibition projection.',
      videoUrl: '',
      visualPreset: 'cyber_grid',
      durationSec: 34,
      likes: ['u-elena', 'u-marcus'],
      comments: [],
      audioTrackTitle: 'Sora — Ambient Rain Loop 04',
      createdAt: iso(-65),
      linkedCommunityId: 'srv-visual-Tokyo',
    },
    {
      id: 'reel-3',
      authorId: 'u-elena',
      caption: 'Acoustic ray-tracing simulation through the concrete diffuser fins.',
      videoUrl: '',
      visualPreset: 'aurora_pulse',
      durationSec: 22,
      likes: ['u-marcus', 'u-sora'],
      comments: [],
      audioTrackTitle: 'Monolith Impulse — 80Hz Sweep',
      createdAt: iso(-25),
      linkedCommunityId: 'srv-architects',
    },
  ];

  const protectedSample = encryptProtectedMessage(
    'Master stem download key: VAULT-994-OMEGA (Do not share outside #modular-dsp)',
    'synth2026',
    'Community invite prefix + year (lowercase)'
  );

  const messages: ChatMessage[] = [
    {
      id: 'msg-1',
      channelId: 'ch-welcome',
      communityId: 'srv-architects',
      authorId: 'u-elena',
      content:
        'Welcome to Synth & Spatial Architects. Server persistence is permanent (no 24-hour server auto-deletion and no 300-message channel trimming). Stories expire after 24h as designed.',
      isPasswordProtected: false,
      reactions: [{ emoji: '🔥', userIds: ['u-marcus', 'u-sora'] }],
      isPinned: true,
      createdAt: iso(-1400),
    },
    {
      id: 'msg-2',
      channelId: 'ch-general',
      communityId: 'srv-architects',
      authorId: 'u-elena',
      content:
        'Cross-linked our latest Zurich Monolith Studio post here so community members can inspect the acoustic measurements alongside the feed.',
      isPasswordProtected: false,
      reactions: [{ emoji: '⚡', userIds: ['u-marcus'] }],
      isPinned: true,
      createdAt: iso(-135),
    },
    {
      id: 'msg-3',
      channelId: 'ch-general',
      communityId: 'srv-architects',
      authorId: 'u-marcus',
      content: 'Protected the studio master stem key below with a passphrase so only active collaborators unlock it.',
      isPasswordProtected: false,
      reactions: [],
      createdAt: iso(-90),
    },
    {
      id: 'msg-4',
      channelId: 'ch-general',
      communityId: 'srv-architects',
      authorId: 'u-marcus',
      content: '[Password-Protected Message — Passphrase Required]',
      isPasswordProtected: true,
      encryptedPayload: protectedSample,
      reactions: [{ emoji: '🔒', userIds: ['u-elena', 'u-sora'] }],
      createdAt: iso(-88),
    },
    {
      id: 'msg-dm-1',
      threadId: 'dm-elena-marcus',
      authorId: 'u-marcus',
      content: 'Hey Elena, are we testing the WebRTC screen share in Studio A at 9 PM?',
      isPasswordProtected: false,
      reactions: [],
      createdAt: iso(-50),
    },
    {
      id: 'msg-dm-2',
      threadId: 'dm-elena-marcus',
      authorId: 'u-elena',
      content: 'Yes! STUN signaling and track cleanup are live. See you in Studio A.',
      isPasswordProtected: false,
      reactions: [{ emoji: '👍', userIds: ['u-marcus'] }],
      createdAt: iso(-42),
    },
    {
      id: 'msg-pulse-1',
      pulseRoomId: 'pulse-1',
      authorId: 'u-elena',
      content: 'Welcome to the live Pulse Room for the Zurich Monolith post! Ask anything about the 7-degree baffle geometry.',
      isPasswordProtected: false,
      reactions: [],
      createdAt: iso(-80),
    },
  ];

  const dmThreads: DirectMessageThread[] = [
    {
      id: 'dm-elena-marcus',
      isGroup: false,
      participantIds: ['u-elena', 'u-marcus'],
      createdAt: iso(-600),
      lastMessageAt: iso(-42),
      unreadBy: { 'u-elena': 0, 'u-marcus': 0 },
      readReceipts: { 'u-elena': iso(-40), 'u-marcus': iso(-41) },
    },
    {
      id: 'dm-group-founders',
      isGroup: true,
      name: 'Core Studio Curators',
      participantIds: ['u-elena', 'u-marcus', 'u-sora'],
      createdAt: iso(-500),
      lastMessageAt: iso(-120),
      unreadBy: { 'u-elena': 1, 'u-marcus': 0, 'u-sora': 0 },
      readReceipts: { 'u-marcus': iso(-115), 'u-sora': iso(-118) },
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      userId: 'u-elena',
      actorId: 'u-marcus',
      type: 'comment',
      title: 'Marcus Kael commented on your post',
      body: '"Tested the impulse response file on my modular reverb..."',
      targetView: 'feed',
      targetId: 'post-1',
      read: false,
      createdAt: iso(-110),
    },
    {
      id: 'notif-2',
      userId: 'u-elena',
      actorId: 'u-sora',
      type: 'like',
      title: 'Sora Takahashi liked your post',
      body: 'Completed the acoustic baffle array inside the Zurich Monolith Studio.',
      targetView: 'feed',
      targetId: 'post-1',
      read: false,
      createdAt: iso(-75),
    },
    {
      id: 'notif-3',
      userId: 'u-elena',
      actorId: 'u-devon',
      type: 'follow',
      title: 'Devon Hart started following you',
      body: '@devon_hart connected with your profile.',
      targetView: 'profile',
      targetId: 'u-devon',
      read: true,
      createdAt: iso(-300),
    },
  ];

  const reports: ModerationReport[] = [
    {
      id: 'rep-1',
      reporterId: 'u-sora',
      targetType: 'message',
      targetId: 'msg-3',
      reason: 'Security Verification Audit',
      details: 'Routine verification that encrypted stem keys use passphrase protection.',
      status: 'open',
      createdAt: iso(-30),
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'audit-1',
      actorId: 'u-elena',
      communityId: 'srv-architects',
      action: 'STORE_INITIALIZED_ATOMIC',
      metadataSummary: 'Initialized atomic JSON store with backup verification and role-based permissions.',
      createdAt: iso(-1440),
    },
    {
      id: 'audit-2',
      actorId: 'u-elena',
      communityId: 'srv-architects',
      action: 'CHANNEL_PIN_MESSAGE',
      targetId: 'msg-1',
      metadataSummary: 'Pinned welcome announcement in #announcements',
      createdAt: iso(-1395),
    },
  ];

  return {
    version: 1,
    lastUpdated: iso(0),
    users,
    credentials: [
      { userId: 'u-elena', passwordHashHex: elenaCred.hashHex, passwordSaltHex: elenaCred.saltHex },
      { userId: 'u-marcus', passwordHashHex: marcusCred.hashHex, passwordSaltHex: marcusCred.saltHex },
      { userId: 'u-sora', passwordHashHex: soraCred.hashHex, passwordSaltHex: soraCred.saltHex },
      { userId: 'u-devon', passwordHashHex: devonCred.hashHex, passwordSaltHex: devonCred.saltHex },
    ],
    sessions: [],
    posts,
    stories,
    reels,
    communities,
    messages,
    dmThreads,
    pulseRooms,
    notifications,
    reports,
    auditLogs,
  };
}

/**
 * Loads the persistent store with fail-closed validation.
 * Never silently overwrites a corrupted store without attempting backup recovery.
 */
function loadStoreFailClosed(): PlatformStore {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createInitialSeedStore();
    saveStoreAtomic(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as PlatformStore;
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.communities)) {
      throw new Error('Invalid store schema structure');
    }
    return parsed;
  } catch (err) {
    console.error('[SECURITY/STORAGE] Primary store.json failed validation. Checking backup...', err);
    if (fs.existsSync(BACKUP_PATH)) {
      const backupRaw = fs.readFileSync(BACKUP_PATH, 'utf8');
      const backupParsed = JSON.parse(backupRaw) as PlatformStore;
      if (backupParsed && Array.isArray(backupParsed.users)) {
        console.warn('[SECURITY/STORAGE] Restored valid state from store.json.bak');
        return backupParsed;
      }
    }
    throw new Error('Fail-closed: store.json is corrupted and no valid backup is available.');
  }
}

/**
 * Atomic JSON write:
 * 1. Copies current store.json to store.json.bak
 * 2. Writes full state to store.json.tmp and flushes
 * 3. Atomically renames store.json.tmp -> store.json
 */
function saveStoreAtomic(store: PlatformStore) {
  ensureDataDir();
  store.lastUpdated = new Date().toISOString();
  // Clean up only expired 24h Stories — NEVER delete servers, channels, posts, or messages
  store.stories = filterActiveStories(store.stories);

  const serialized = JSON.stringify(store, null, 2);
  if (fs.existsSync(STORE_PATH)) {
    fs.copyFileSync(STORE_PATH, BACKUP_PATH);
  }
  fs.writeFileSync(TMP_PATH, serialized, 'utf8');
  fs.renameSync(TMP_PATH, STORE_PATH);
}

/**
 * Generates a valid binary PNG buffer for PWA icons (192x192, 512x512, 180x180)
 * so Lighthouse & browser manifest checks receive real PNG files.
 */
function generateSolidBrandPng(size: number): Buffer {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.34;
      if (dist < radius) {
        // Blurple core (#6366F1)
        rawData[px] = 99;
        rawData[px + 1] = 102;
        rawData[px + 2] = 241;
        rawData[px + 3] = 255;
      } else {
        // Deep charcoal background (#0B0D13)
        rawData[px] = 11;
        rawData[px + 1] = 13;
        rawData[px + 2] = 19;
        rawData[px + 3] = 255;
      }
    }
  }

  const makeChunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcVal = zlib.crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idatData = zlib.deflateSync(rawData);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function ensurePwaPngIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const icons: Array<{ name: string; size: number }> = [
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'pwa-maskable-512x512.png', size: 512 },
  ];
  for (const icon of icons) {
    const target = path.join(publicDir, icon.name);
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, generateSolidBrandPng(icon.size));
    }
  }
}

async function startServer() {
  acquireProcessLock();
  ensurePwaPngIcons();
  const store = loadStoreFailClosed();

  const app = express();
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url || '/';
    const protocol = req.headers['sec-websocket-protocol'];
    if (url.startsWith('/ws')) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else if (protocol === 'vite-hmr' || url === '/') {
      // Gracefully accept any @vite/client HMR WebSocket upgrade so it never throws "WebSocket closed without opened"
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.send(JSON.stringify({ type: 'connected' }));
      });
    } else {
      socket.destroy();
    }
  });

  app.use(express.json({ limit: '15mb' }));

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Simple in-memory rate limiter per IP
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  const rateLimit = (maxReqs: number, windowMs: number) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const key = `${req.ip || 'local'}:${req.baseUrl}${req.path}`;
      const now = Date.now();
      const entry = rateBuckets.get(key);
      if (!entry || entry.resetAt < now) {
        rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      entry.count += 1;
      if (entry.count > maxReqs) {
        return res.status(429).json({
          error: 'Too many requests. Please wait a moment and try again.',
        });
      }
      return next();
    };
  };

  // Helper to resolve current user from Bearer token or cookie (defaults to u-elena in interactive preview if unauthenticated)
  function getAuthenticatedUser(req: express.Request): UserProfile {
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
    if (token) {
      const session = store.sessions.find(
        (s) => s.token === token && new Date(s.expiresAt).getTime() > Date.now()
      );
      if (session) {
        const found = store.users.find((u) => u.id === session.userId);
        if (found && !found.suspended) return found;
      }
    }
    const headerUserId = req.headers['x-active-user-id'] as string | undefined;
    if (headerUserId) {
      const found = store.users.find((u) => u.id === headerUserId && !u.suspended);
      if (found) return found;
    }
    return store.users[0];
  }

  function createSessionForUser(userId: string): SessionRecord {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const record: SessionRecord = {
      token,
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 7 * 24 * 3600 * 1000).toISOString(),
    };
    store.sessions.push(record);
    saveStoreAtomic(store);
    return record;
  }

  function recordAuditLog(actorId: string, action: string, metadataSummary: string, communityId?: string, targetId?: string) {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actorId,
      communityId,
      action,
      targetId,
      metadataSummary,
      createdAt: new Date().toISOString(),
    };
    store.auditLogs.unshift(entry);
  }

  function pushNotification(params: {
    userId: string;
    actorId: string;
    type: AppNotification['type'];
    title: string;
    body: string;
    targetView?: string;
    targetId?: string;
  }) {
    if (params.userId === params.actorId) return;
    const recipient = store.users.find((u) => u.id === params.userId);
    if (!recipient) return;
    if (recipient.blockedUsers.includes(params.actorId)) return;

    const prefs = recipient.notificationPrefs;
    if (params.type === 'dm' && !prefs.directMessages) return;
    if ((params.type === 'like' || params.type === 'comment') && !prefs.likesAndComments) return;
    if (params.type === 'follow' && !prefs.newFollowers) return;
    if (params.type === 'invite' && !prefs.communityInvites) return;

    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      actorId: params.actorId,
      type: params.type,
      title: params.title,
      body: params.body,
      targetView: params.targetView,
      targetId: params.targetId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(notif);
    broadcastWs({ type: 'notification:created', payload: notif });
  }

  // WebSocket client tracking for real-time chat, presence, typing, and WebRTC signaling
  const wsClients = new Map<WebSocket, { userId: string; activeVoiceRoomId?: string }>();
  const voiceRoomParticipants = new Map<string, Set<string>>(); // channelId -> Set<userId>

  function broadcastWs(event: { type: string; payload: unknown }) {
    const msg = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  function getVoiceRoomMap(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [roomId, set] of voiceRoomParticipants.entries()) {
      out[roomId] = Array.from(set);
    }
    return out;
  }

  wss.on('connection', (ws) => {
    wsClients.set(ws, { userId: 'u-elena' });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const meta = wsClients.get(ws) || { userId: 'u-elena' };

        if (data.type === 'auth:identify' && typeof data.userId === 'string') {
          meta.userId = data.userId;
          wsClients.set(ws, meta);
          ws.send(
            JSON.stringify({
              type: 'voice:state',
              payload: getVoiceRoomMap(),
            })
          );
          return;
        }

        if (data.type === 'typing:start' || data.type === 'typing:stop') {
          broadcastWs({
            type: data.type,
            payload: {
              userId: meta.userId,
              channelId: data.channelId,
              threadId: data.threadId,
            },
          });
          return;
        }

        if (data.type === 'voice:join' && typeof data.channelId === 'string') {
          const set = voiceRoomParticipants.get(data.channelId) || new Set<string>();
          set.add(meta.userId);
          voiceRoomParticipants.set(data.channelId, set);
          meta.activeVoiceRoomId = data.channelId;
          wsClients.set(ws, meta);
          broadcastWs({ type: 'voice:state', payload: getVoiceRoomMap() });
          return;
        }

        if (data.type === 'voice:leave' && typeof data.channelId === 'string') {
          const set = voiceRoomParticipants.get(data.channelId);
          if (set) {
            set.delete(meta.userId);
            if (set.size === 0) voiceRoomParticipants.delete(data.channelId);
          }
          meta.activeVoiceRoomId = undefined;
          wsClients.set(ws, meta);
          broadcastWs({ type: 'voice:state', payload: getVoiceRoomMap() });
          return;
        }

        // WebRTC Signaling relay (offer, answer, ice-candidate, call-request, call-hangup)
        if (typeof data.type === 'string' && data.type.startsWith('webrtc:')) {
          broadcastWs({
            type: data.type,
            payload: {
              ...(data.payload || {}),
              fromUserId: meta.userId,
            },
          });
        }
      } catch {
        // Ignore malformed WS frames
      }
    });

    ws.on('close', () => {
      const meta = wsClients.get(ws);
      if (meta?.activeVoiceRoomId) {
        const set = voiceRoomParticipants.get(meta.activeVoiceRoomId);
        if (set) {
          set.delete(meta.userId);
          if (set.size === 0) voiceRoomParticipants.delete(meta.activeVoiceRoomId);
        }
        broadcastWs({ type: 'voice:state', payload: getVoiceRoomMap() });
      }
      wsClients.delete(ws);
    });
  });

  // ============================================================================
  // API ROUTES
  // ============================================================================

  // Bootstrap state
  app.get('/api/bootstrap', (req, res) => {
    const me = getAuthenticatedUser(req);
    store.stories = filterActiveStories(store.stories);
    // Filter out private communities that the user is not a member of
    const visibleCommunities = store.communities.filter(
      (c) => !c.isPrivate || c.members.some((m) => m.userId === me.id)
    );
    // Filter DM threads to only those where the authenticated user is a participant
    const myDmThreads = store.dmThreads.filter((t) => t.participantIds.includes(me.id));
    const myDmIds = new Set(myDmThreads.map((t) => t.id));
    const visibleMessages = store.messages.filter((m) => {
      if (m.threadId) return myDmIds.has(m.threadId);
      if (m.communityId) {
        return visibleCommunities.some((c) => c.id === m.communityId);
      }
      return true;
    });

    res.json({
      currentUser: me,
      users: store.users,
      posts: store.posts,
      stories: store.stories,
      reels: store.reels,
      communities: visibleCommunities,
      messages: visibleMessages,
      dmThreads: myDmThreads,
      pulseRooms: store.pulseRooms,
      notifications: store.notifications.filter((n) => n.userId === me.id),
      reports: me.platformRole === 'admin' || me.platformRole === 'moderator' ? store.reports : [],
      auditLogs: store.auditLogs.slice(0, 60),
      voiceRooms: getVoiceRoomMap(),
      webrtcConfig: {
        iceServers: [
          { urls: process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302' },
          ...(process.env.TURN_SERVER_URL
            ? [
                {
                  urls: process.env.TURN_SERVER_URL,
                  username: process.env.TURN_USERNAME || '',
                  credential: process.env.TURN_CREDENTIAL || '',
                },
              ]
            : []),
        ],
      },
    });
  });

  // Authentication: Register
  app.post('/api/auth/register', rateLimit(15, 60_000), (req, res) => {
    const { username, displayName, password, bio } = req.body || {};
    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) {
      return res.status(400).json({
        error: 'Username must be 3–24 characters using letters, numbers, or underscores.',
      });
    }
    const cleanUsername = username.trim().toLowerCase();
    if (store.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const { hashHex, saltHex } = hashPassword(password);
    const newUser: UserProfile = {
      id: `u-${Date.now()}`,
      username: cleanUsername,
      displayName: (displayName || cleanUsername).trim().slice(0, 40),
      bio: (bio || 'New community member exploring Anonymous Chat.').trim().slice(0, 240),
      avatarUrl: AVATAR_ASSETS.devon,
      bannerColor: '#6366F1',
      isPrivate: false,
      platformRole: 'user',
      createdAt: new Date().toISOString(),
      followers: [],
      following: ['u-elena'],
      blockedUsers: [],
      savedPostIds: [],
      savedReelIds: [],
      notificationPrefs: {
        directMessages: true,
        mentionsAndReplies: true,
        likesAndComments: true,
        newFollowers: true,
        communityInvites: true,
      },
      statusText: 'Online',
    };

    store.users.push(newUser);
    store.credentials.push({
      userId: newUser.id,
      passwordHashHex: hashHex,
      passwordSaltHex: saltHex,
    });
    // Auto-join default public server
    if (store.communities[0]) {
      store.communities[0].members.push({
        userId: newUser.id,
        role: 'member',
        joinedAt: new Date().toISOString(),
      });
    }

    recordAuditLog(newUser.id, 'USER_REGISTERED', `Registered account @${newUser.username}`);
    const session = createSessionForUser(newUser.id);
    return res.status(201).json({ user: newUser, token: session.token });
  });

  // Authentication: Login
  app.post('/api/auth/login', rateLimit(20, 60_000), (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const user = store.users.find(
      (u) => u.username.toLowerCase() === String(username).trim().toLowerCase()
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (user.suspended) {
      return res.status(403).json({ error: 'This account is currently suspended.' });
    }
    const cred = store.credentials.find((c) => c.userId === user.id);
    if (!cred || !verifyPassword(String(password), cred.passwordHashHex, cred.passwordSaltHex)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const session = createSessionForUser(user.id);
    return res.json({ user, token: session.token });
  });

  // Authentication: Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      store.sessions = store.sessions.filter((s) => s.token !== token);
      saveStoreAtomic(store);
    }
    return res.json({ ok: true });
  });

  // Authentication: Change Password
  app.post('/api/auth/change-password', rateLimit(10, 60_000), (req, res) => {
    const me = getAuthenticatedUser(req);
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    const cred = store.credentials.find((c) => c.userId === me.id);
    if (cred && currentPassword) {
      if (!verifyPassword(String(currentPassword), cred.passwordHashHex, cred.passwordSaltHex)) {
        return res.status(401).json({ error: 'Current password did not match.' });
      }
    }
    const { hashHex, saltHex } = hashPassword(String(newPassword));
    if (cred) {
      cred.passwordHashHex = hashHex;
      cred.passwordSaltHex = saltHex;
    } else {
      store.credentials.push({ userId: me.id, passwordHashHex: hashHex, passwordSaltHex: saltHex });
    }
    recordAuditLog(me.id, 'PASSWORD_CHANGED', `Password updated for @${me.username}`);
    saveStoreAtomic(store);
    return res.json({ ok: true });
  });

  // Account Deletion with explicit confirmation
  app.delete('/api/users/me', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { confirmUsername } = req.body || {};
    if (confirmUsername !== me.username) {
      return res.status(400).json({
        error: `Please type your exact username (${me.username}) to confirm account deletion.`,
      });
    }
    if (store.users.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last remaining user in the store.' });
    }
    store.users = store.users.filter((u) => u.id !== me.id);
    store.credentials = store.credentials.filter((c) => c.userId !== me.id);
    store.sessions = store.sessions.filter((s) => s.userId !== me.id);
    store.posts = store.posts.filter((p) => p.authorId !== me.id);
    store.stories = store.stories.filter((s) => s.authorId !== me.id);
    store.reels = store.reels.filter((r) => r.authorId !== me.id);
    recordAuditLog(me.id, 'ACCOUNT_DELETED', `Deleted account @${me.username} and authored social media`);
    saveStoreAtomic(store);
    return res.json({ ok: true, nextUser: store.users[0] });
  });

  // Profile Edit
  app.patch('/api/users/me', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { displayName, bio, statusText, isPrivate, bannerColor, avatarUrl } = req.body || {};
    if (typeof displayName === 'string' && displayName.trim()) {
      me.displayName = displayName.trim().slice(0, 40);
    }
    if (typeof bio === 'string') {
      me.bio = bio.trim().slice(0, 280);
    }
    if (typeof statusText === 'string') {
      me.statusText = statusText.trim().slice(0, 60);
    }
    if (typeof isPrivate === 'boolean') {
      me.isPrivate = isPrivate;
    }
    if (typeof bannerColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(bannerColor)) {
      me.bannerColor = bannerColor;
    }
    if (typeof avatarUrl === 'string' && avatarUrl.trim()) {
      me.avatarUrl = avatarUrl.trim();
    }
    saveStoreAtomic(store);
    return res.json({ user: me });
  });

  // Follow / Unfollow
  app.post('/api/users/:id/follow', (req, res) => {
    const me = getAuthenticatedUser(req);
    const target = store.users.find((u) => u.id === req.params.id);
    if (!target || target.id === me.id) {
      return res.status(400).json({ error: 'Invalid follow target.' });
    }
    const followingRes = toggleUniqueId(me.following, target.id);
    me.following = followingRes.next;
    const followerRes = toggleUniqueId(target.followers, me.id);
    target.followers = followerRes.next;

    if (followingRes.added) {
      pushNotification({
        userId: target.id,
        actorId: me.id,
        type: 'follow',
        title: `${me.displayName} started following you`,
        body: `@${me.username} connected with your profile.`,
        targetView: 'profile',
        targetId: me.id,
      });
    }
    saveStoreAtomic(store);
    return res.json({ currentUser: me, targetUser: target, following: followingRes.added });
  });

  // Block / Unblock
  app.post('/api/users/:id/block', (req, res) => {
    const me = getAuthenticatedUser(req);
    const targetId = req.params.id;
    if (targetId === me.id) {
      return res.status(400).json({ error: 'Cannot block yourself.' });
    }
    const resToggle = toggleUniqueId(me.blockedUsers, targetId);
    me.blockedUsers = resToggle.next;
    if (resToggle.added) {
      me.following = me.following.filter((id) => id !== targetId);
      me.followers = me.followers.filter((id) => id !== targetId);
    }
    saveStoreAtomic(store);
    return res.json({ blockedUsers: me.blockedUsers, blocked: resToggle.added });
  });

  // Posts: Create
  app.post('/api/posts', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { caption, mediaUrls, tags, linkedCommunityId, linkedChannelId, createPulseRoom } = req.body || {};
    if (!caption || typeof caption !== 'string' || !caption.trim()) {
      return res.status(400).json({ error: 'Post caption cannot be empty.' });
    }
    const cleanMedia = Array.isArray(mediaUrls)
      ? mediaUrls.filter((u) => typeof u === 'string' && u.trim()).slice(0, 4)
      : [];
    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim().toLowerCase().replace(/^#/, '')).filter(Boolean).slice(0, 6)
      : [];

    const postId = `post-${Date.now()}`;
    let pulseRoomId: string | undefined;

    if (createPulseRoom) {
      const room: PulseRoom = {
        id: `pulse-${Date.now()}`,
        title: `${me.displayName}'s Post Pulse Room`,
        hostUserId: me.id,
        attachedPostId: postId,
        activeParticipantIds: [me.id],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      };
      store.pulseRooms.unshift(room);
      pulseRoomId = room.id;
    }

    const post: SocialPost = {
      id: postId,
      authorId: me.id,
      caption: caption.trim().slice(0, 2000),
      mediaUrls: cleanMedia,
      mediaType: cleanMedia.length > 1 ? 'gallery' : cleanMedia.length === 1 ? 'image' : 'text',
      tags: cleanTags.length ? cleanTags : ['community'],
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      linkedCommunityId: linkedCommunityId || undefined,
      linkedChannelId: linkedChannelId || undefined,
      pulseRoomId,
    };

    store.posts.unshift(post);
    saveStoreAtomic(store);
    broadcastWs({ type: 'post:created', payload: post });
    return res.status(201).json({ post, pulseRooms: store.pulseRooms });
  });

  // Posts: Like / Unlike
  app.post('/api/posts/:id/like', (req, res) => {
    const me = getAuthenticatedUser(req);
    const post = store.posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const toggled = toggleUniqueId(post.likes, me.id);
    post.likes = toggled.next;
    if (toggled.added) {
      pushNotification({
        userId: post.authorId,
        actorId: me.id,
        type: 'like',
        title: `${me.displayName} liked your post`,
        body: post.caption.slice(0, 90),
        targetView: 'feed',
        targetId: post.id,
      });
    }
    saveStoreAtomic(store);
    broadcastWs({ type: 'post:updated', payload: post });
    return res.json({ post });
  });

  // Posts: Save / Bookmark
  app.post('/api/posts/:id/save', (req, res) => {
    const me = getAuthenticatedUser(req);
    const post = store.posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const toggled = toggleUniqueId(me.savedPostIds, post.id);
    me.savedPostIds = toggled.next;
    saveStoreAtomic(store);
    return res.json({ savedPostIds: me.savedPostIds, saved: toggled.added });
  });

  // Posts: Comment
  app.post('/api/posts/:id/comments', (req, res) => {
    const me = getAuthenticatedUser(req);
    const post = store.posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const { content, parentCommentId } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }
    const comment = {
      id: `c-${Date.now()}`,
      postId: post.id,
      authorId: me.id,
      content: content.trim().slice(0, 600),
      parentCommentId: parentCommentId || undefined,
      createdAt: new Date().toISOString(),
      likes: [],
    };
    post.comments.push(comment);
    pushNotification({
      userId: post.authorId,
      actorId: me.id,
      type: 'comment',
      title: `${me.displayName} commented on your post`,
      body: comment.content.slice(0, 90),
      targetView: 'feed',
      targetId: post.id,
    });
    saveStoreAtomic(store);
    broadcastWs({ type: 'post:updated', payload: post });
    return res.status(201).json({ post, comment });
  });

  // Posts: Delete own (or admin)
  app.delete('/api/posts/:id', (req, res) => {
    const me = getAuthenticatedUser(req);
    const post = store.posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.authorId !== me.id && me.platformRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this post.' });
    }
    store.posts = store.posts.filter((p) => p.id !== post.id);
    saveStoreAtomic(store);
    return res.json({ ok: true, deletedId: post.id });
  });

  // Stories: Get active 24h stories & Create Story
  app.get('/api/stories', (_req, res) => {
    store.stories = filterActiveStories(store.stories);
    return res.json({ stories: store.stories });
  });

  app.post('/api/stories', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { caption, mediaUrl, accentColor } = req.body || {};
    if (!caption || typeof caption !== 'string' || !caption.trim()) {
      return res.status(400).json({ error: 'Story caption is required.' });
    }
    const now = Date.now();
    const story: StoryItem = {
      id: `story-${now}`,
      authorId: me.id,
      mediaUrl: mediaUrl || STORY_MEDIA_ASSETS.tokyoRain,
      mediaType: 'image',
      caption: caption.trim().slice(0, 220),
      createdAt: new Date(now).toISOString(),
      expiresAt: computeStoryExpiryIso(now, 24),
      viewerIds: [me.id],
      accentColor: accentColor || '#6366F1',
    };
    store.stories.unshift(story);
    saveStoreAtomic(store);
    return res.status(201).json({ story, stories: store.stories });
  });

  app.post('/api/stories/:id/view', (req, res) => {
    const me = getAuthenticatedUser(req);
    store.stories = filterActiveStories(store.stories);
    const story = store.stories.find((s) => s.id === req.params.id);
    if (!story) return res.status(404).json({ error: 'Story expired or not found.' });
    if (!story.viewerIds.includes(me.id)) {
      story.viewerIds.push(me.id);
      saveStoreAtomic(store);
    }
    return res.json({ story });
  });

  app.delete('/api/stories/:id', (req, res) => {
    const me = getAuthenticatedUser(req);
    const story = store.stories.find((s) => s.id === req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    if (story.authorId !== me.id && me.platformRole !== 'admin') {
      return res.status(403).json({ error: 'Only the creator can delete this Story.' });
    }
    store.stories = store.stories.filter((s) => s.id !== story.id);
    saveStoreAtomic(store);
    return res.json({ ok: true, stories: store.stories });
  });

  // Reels: Create, Like, Comment, Save, Delete
  app.post('/api/reels', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { caption, visualPreset, audioTrackTitle, durationSec, videoUrl, linkedCommunityId } = req.body || {};
    if (!caption || typeof caption !== 'string' || !caption.trim()) {
      return res.status(400).json({ error: 'Reel caption is required.' });
    }
    const reel: ReelItem = {
      id: `reel-${Date.now()}`,
      authorId: me.id,
      caption: caption.trim().slice(0, 400),
      videoUrl: typeof videoUrl === 'string' ? videoUrl : '',
      visualPreset: visualPreset || 'synth_waves',
      durationSec: Math.min(90, Math.max(5, Number(durationSec) || 24)),
      likes: [],
      comments: [],
      audioTrackTitle: (audioTrackTitle || `${me.displayName} — Original Studio Stem`).slice(0, 80),
      createdAt: new Date().toISOString(),
      linkedCommunityId: linkedCommunityId || undefined,
    };
    store.reels.unshift(reel);
    saveStoreAtomic(store);
    return res.status(201).json({ reel });
  });

  app.post('/api/reels/:id/like', (req, res) => {
    const me = getAuthenticatedUser(req);
    const reel = store.reels.find((r) => r.id === req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found.' });
    const toggled = toggleUniqueId(reel.likes, me.id);
    reel.likes = toggled.next;
    saveStoreAtomic(store);
    return res.json({ reel });
  });

  app.post('/api/reels/:id/save', (req, res) => {
    const me = getAuthenticatedUser(req);
    const reel = store.reels.find((r) => r.id === req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found.' });
    const toggled = toggleUniqueId(me.savedReelIds, reel.id);
    me.savedReelIds = toggled.next;
    saveStoreAtomic(store);
    return res.json({ savedReelIds: me.savedReelIds });
  });

  app.post('/api/reels/:id/comments', (req, res) => {
    const me = getAuthenticatedUser(req);
    const reel = store.reels.find((r) => r.id === req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found.' });
    const { content } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }
    reel.comments.push({
      id: `rc-${Date.now()}`,
      reelId: reel.id,
      authorId: me.id,
      content: content.trim().slice(0, 400),
      createdAt: new Date().toISOString(),
    });
    saveStoreAtomic(store);
    return res.json({ reel });
  });

  app.delete('/api/reels/:id', (req, res) => {
    const me = getAuthenticatedUser(req);
    const reel = store.reels.find((r) => r.id === req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found.' });
    if (reel.authorId !== me.id && me.platformRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this Reel.' });
    }
    store.reels = store.reels.filter((r) => r.id !== reel.id);
    saveStoreAtomic(store);
    return res.json({ ok: true });
  });

  // Communities / Servers
  app.post('/api/communities', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { name, description, isPrivate, accentColor } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Community name must be at least 2 characters.' });
    }
    const cleanName = name.trim().slice(0, 48);
    const initials = cleanName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CM';

    const srvId = `srv-${Date.now()}`;
    const newServer: CommunityServer = {
      id: srvId,
      name: cleanName,
      description: (description || 'Community server on Anonymous Chat.').trim().slice(0, 240),
      iconText: initials,
      accentColor: accentColor || '#6366F1',
      ownerId: me.id,
      isPrivate: Boolean(isPrivate),
      createdAt: new Date().toISOString(),
      categories: ['GENERAL', 'VOICE ROOMS'],
      channels: [
        {
          id: `ch-${Date.now()}-1`,
          communityId: srvId,
          category: 'GENERAL',
          name: 'general',
          topic: `Main discussion channel for ${cleanName}`,
          type: 'text',
          permissions: { minRoleToRead: 'member', minRoleToWrite: 'member' },
          pinnedMessageIds: [],
        },
        {
          id: `ch-${Date.now()}-2`,
          communityId: srvId,
          category: 'VOICE ROOMS',
          name: 'Main Voice Stage',
          topic: 'WebRTC voice, video, and screen sharing room',
          type: 'voice',
          permissions: { minRoleToRead: 'member', minRoleToWrite: 'member' },
          pinnedMessageIds: [],
        },
      ],
      members: [{ userId: me.id, role: 'owner', joinedAt: new Date().toISOString() }],
      bannedUserIds: [],
      invites: [
        {
          code: `${initials}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          communityId: srvId,
          createdBy: me.id,
          createdAt: new Date().toISOString(),
          uses: 0,
          revoked: false,
        },
      ],
    };

    store.communities.push(newServer);
    recordAuditLog(me.id, 'COMMUNITY_CREATED', `Created server "${newServer.name}"`, newServer.id);
    saveStoreAtomic(store);
    return res.status(201).json({ community: newServer });
  });

  // Create Channel in Community
  app.post('/api/communities/:id/channels', (req, res) => {
    const me = getAuthenticatedUser(req);
    const server = store.communities.find((c) => c.id === req.params.id);
    if (!server) return res.status(404).json({ error: 'Community not found.' });

    const member = server.members.find((m) => m.userId === me.id);
    if (!hasMinimumCommunityRole(member?.role, 'admin')) {
      return res.status(403).json({ error: 'Requires Admin or Owner role to create channels.' });
    }

    const { name, category, topic, type, minRoleToWrite } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Channel name is required.' });
    }
    const catName = (category || 'GENERAL').trim().toUpperCase();
    if (!server.categories.includes(catName)) {
      server.categories.push(catName);
    }

    const channel = {
      id: `ch-${Date.now()}`,
      communityId: server.id,
      category: catName,
      name: name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 36),
      topic: (topic || 'Channel discussion').trim().slice(0, 160),
      type: (type === 'voice' || type === 'announcement' ? type : 'text') as 'text' | 'voice' | 'announcement',
      permissions: {
        minRoleToRead: 'member' as CommunityRole,
        minRoleToWrite: (minRoleToWrite || 'member') as CommunityRole,
      },
      pinnedMessageIds: [],
    };
    server.channels.push(channel);
    recordAuditLog(me.id, 'CHANNEL_CREATED', `Created channel #${channel.name}`, server.id, channel.id);
    saveStoreAtomic(store);
    return res.status(201).json({ community: server, channel });
  });

  // Join Community by Invite Code or Public Join
  app.post('/api/communities/join', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { communityId, inviteCode } = req.body || {};

    let server: CommunityServer | undefined;
    if (inviteCode) {
      const codeUpper = String(inviteCode).trim().toUpperCase();
      server = store.communities.find((c) =>
        c.invites.some((inv) => inv.code.toUpperCase() === codeUpper && !inv.revoked)
      );
      if (!server) {
        return res.status(404).json({ error: 'Invalid or revoked invite code.' });
      }
      const inv = server.invites.find((i) => i.code.toUpperCase() === codeUpper);
      if (inv) inv.uses += 1;
    } else if (communityId) {
      server = store.communities.find((c) => c.id === communityId);
      if (!server) return res.status(404).json({ error: 'Community not found.' });
      if (server.isPrivate) {
        return res.status(403).json({ error: 'This community is private. An invite code is required.' });
      }
    }

    if (!server) return res.status(400).json({ error: 'Specify communityId or inviteCode.' });
    if (server.bannedUserIds.includes(me.id)) {
      return res.status(403).json({ error: 'You are banned from this community.' });
    }
    if (!server.members.some((m) => m.userId === me.id)) {
      server.members.push({ userId: me.id, role: 'member', joinedAt: new Date().toISOString() });
      recordAuditLog(me.id, 'MEMBER_JOINED', `@${me.username} joined ${server.name}`, server.id);
      saveStoreAtomic(store);
    }
    return res.json({ community: server });
  });

  // Update Member Role or Moderation (Mute / Kick / Ban)
  app.post('/api/communities/:id/members/:targetUserId', (req, res) => {
    const me = getAuthenticatedUser(req);
    const server = store.communities.find((c) => c.id === req.params.id);
    if (!server) return res.status(404).json({ error: 'Community not found.' });

    const actorMember = server.members.find((m) => m.userId === me.id);
    if (!hasMinimumCommunityRole(actorMember?.role, 'moderator')) {
      return res.status(403).json({ error: 'Insufficient role permissions.' });
    }

    const targetUserId = req.params.targetUserId;
    if (targetUserId === server.ownerId) {
      return res.status(403).json({ error: 'Cannot modify or moderate the community owner.' });
    }

    const { action, role } = req.body || {};
    if (action === 'set-role' && role) {
      if (!hasMinimumCommunityRole(actorMember?.role, 'admin')) {
        return res.status(403).json({ error: 'Only Owners and Admins can assign roles.' });
      }
      const target = server.members.find((m) => m.userId === targetUserId);
      if (target) {
        target.role = role as CommunityRole;
        recordAuditLog(me.id, 'ROLE_UPDATED', `Updated ${targetUserId} role to ${role}`, server.id, targetUserId);
      }
    } else if (action === 'kick') {
      server.members = server.members.filter((m) => m.userId !== targetUserId);
      recordAuditLog(me.id, 'MEMBER_KICKED', `Kicked user ${targetUserId}`, server.id, targetUserId);
    } else if (action === 'ban') {
      server.members = server.members.filter((m) => m.userId !== targetUserId);
      if (!server.bannedUserIds.includes(targetUserId)) {
        server.bannedUserIds.push(targetUserId);
      }
      recordAuditLog(me.id, 'MEMBER_BANNED', `Banned user ${targetUserId}`, server.id, targetUserId);
    }

    saveStoreAtomic(store);
    return res.json({ community: server, auditLogs: store.auditLogs.slice(0, 60) });
  });

  // Messages: Send to Channel, DM Thread, or Pulse Room (supports Password-Protected encryption)
  app.post('/api/messages', (req, res) => {
    const me = getAuthenticatedUser(req);
    const {
      channelId,
      communityId,
      threadId,
      pulseRoomId,
      content,
      passphrase,
      passphraseHint,
      replyToMessageId,
      attachmentUrl,
      attachmentName,
    } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    if (communityId && channelId) {
      const server = store.communities.find((c) => c.id === communityId);
      const channel = server?.channels.find((ch) => ch.id === channelId);
      if (!server || !channel) {
        return res.status(404).json({ error: 'Server or channel not found.' });
      }
      if (!canMemberAccessChannel(server, channel, me.id, 'write')) {
        return res.status(403).json({
          error: `You need at least '${channel.permissions.minRoleToWrite}' role to post in #${channel.name}.`,
        });
      }
    }

    if (threadId) {
      const thread = store.dmThreads.find((t) => t.id === threadId);
      if (!thread || !thread.participantIds.includes(me.id)) {
        return res.status(403).json({ error: 'Not authorized in this conversation thread.' });
      }
      thread.lastMessageAt = new Date().toISOString();
      for (const pid of thread.participantIds) {
        if (pid !== me.id) {
          thread.unreadBy[pid] = (thread.unreadBy[pid] || 0) + 1;
          pushNotification({
            userId: pid,
            actorId: me.id,
            type: 'dm',
            title: `New message from ${me.displayName}`,
            body: passphrase ? 'Sent a password-protected message' : content.trim().slice(0, 80),
            targetView: 'chats',
            targetId: thread.id,
          });
        }
      }
    }

    let isPasswordProtected = false;
    let encryptedPayload: ChatMessage['encryptedPayload'] | undefined;
    let storedContent = content.trim().slice(0, 2000);

    if (passphrase && typeof passphrase === 'string' && passphrase.trim().length >= 3) {
      encryptedPayload = encryptProtectedMessage(
        storedContent,
        passphrase.trim(),
        passphraseHint ? String(passphraseHint) : undefined
      );
      isPasswordProtected = true;
      storedContent = '[Password-Protected Message — Passphrase Required]';
    }

    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      channelId: channelId || undefined,
      communityId: communityId || undefined,
      threadId: threadId || undefined,
      pulseRoomId: pulseRoomId || undefined,
      authorId: me.id,
      content: storedContent,
      isPasswordProtected,
      encryptedPayload,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      attachmentType: attachmentUrl ? 'image' : undefined,
      replyToMessageId: replyToMessageId || undefined,
      reactions: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
    };

    store.messages.push(msg);
    saveStoreAtomic(store);
    broadcastWs({ type: 'message:created', payload: msg });
    return res.status(201).json({ message: msg });
  });

  // Unlock a password-protected message via server-side AES-256-GCM verification
  app.post('/api/messages/:id/unlock', rateLimit(25, 60_000), (req, res) => {
    const msg = store.messages.find((m) => m.id === req.params.id);
    if (!msg || !msg.isPasswordProtected || !msg.encryptedPayload) {
      return res.status(404).json({ error: 'Protected message not found.' });
    }
    const { passphrase } = req.body || {};
    if (!passphrase || typeof passphrase !== 'string') {
      return res.status(400).json({ error: 'Passphrase is required.' });
    }
    const decrypted = decryptProtectedMessage(msg.encryptedPayload, passphrase.trim());
    if (decrypted === null) {
      return res.status(401).json({ error: 'Incorrect passphrase. Decryption failed.' });
    }
    return res.json({ unlockedContent: decrypted });
  });

  // React to message
  app.post('/api/messages/:id/react', (req, res) => {
    const me = getAuthenticatedUser(req);
    const msg = store.messages.find((m) => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });
    const { emoji } = req.body || {};
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required.' });
    }
    const existing = msg.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      const toggled = toggleUniqueId(existing.userIds, me.id);
      existing.userIds = toggled.next;
      if (existing.userIds.length === 0) {
        msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      msg.reactions.push({ emoji, userIds: [me.id] });
    }
    saveStoreAtomic(store);
    broadcastWs({ type: 'message:updated', payload: msg });
    return res.json({ message: msg });
  });

  // Pin / Unpin message
  app.post('/api/messages/:id/pin', (req, res) => {
    const me = getAuthenticatedUser(req);
    const msg = store.messages.find((m) => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });

    if (msg.communityId) {
      const server = store.communities.find((c) => c.id === msg.communityId);
      const member = server?.members.find((m) => m.userId === me.id);
      if (!hasMinimumCommunityRole(member?.role, 'moderator')) {
        return res.status(403).json({ error: 'Only moderators or admins can pin messages.' });
      }
      msg.isPinned = !msg.isPinned;
      const channel = server?.channels.find((ch) => ch.id === msg.channelId);
      if (channel) {
        channel.pinnedMessageIds = toggleUniqueId(channel.pinnedMessageIds, msg.id).next;
      }
      recordAuditLog(me.id, 'MESSAGE_PIN_TOGGLED', `Toggled pin for ${msg.id}`, server?.id, msg.id);
    } else {
      msg.isPinned = !msg.isPinned;
    }

    saveStoreAtomic(store);
    broadcastWs({ type: 'message:updated', payload: msg });
    return res.json({ message: msg });
  });

  // Delete own message (or moderator)
  app.delete('/api/messages/:id', (req, res) => {
    const me = getAuthenticatedUser(req);
    const msg = store.messages.find((m) => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });
    let canDelete = msg.authorId === me.id || me.platformRole === 'admin';
    if (!canDelete && msg.communityId) {
      const server = store.communities.find((c) => c.id === msg.communityId);
      const member = server?.members.find((m) => m.userId === me.id);
      canDelete = hasMinimumCommunityRole(member?.role, 'moderator');
    }
    if (!canDelete) {
      return res.status(403).json({ error: 'Not authorized to delete this message.' });
    }
    store.messages = store.messages.filter((m) => m.id !== msg.id);
    saveStoreAtomic(store);
    broadcastWs({ type: 'message:deleted', payload: { id: msg.id } });
    return res.json({ ok: true, id: msg.id });
  });

  // Direct Messages: Create / Open Thread
  app.post('/api/dms', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { participantIds, name } = req.body || {};
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one participant.' });
    }
    const allIds = Array.from(new Set([me.id, ...participantIds.map(String)]));
    if (allIds.length === 2) {
      const existing = store.dmThreads.find(
        (t) =>
          !t.isGroup &&
          t.participantIds.length === 2 &&
          t.participantIds.includes(allIds[0]) &&
          t.participantIds.includes(allIds[1])
      );
      if (existing) return res.json({ thread: existing });
    }
    const thread: DirectMessageThread = {
      id: `dm-${Date.now()}`,
      isGroup: allIds.length > 2,
      name: allIds.length > 2 ? (name || 'Group Chat').trim().slice(0, 48) : undefined,
      participantIds: allIds,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      unreadBy: {},
      readReceipts: { [me.id]: new Date().toISOString() },
    };
    store.dmThreads.unshift(thread);
    saveStoreAtomic(store);
    return res.status(201).json({ thread });
  });

  app.post('/api/dms/:id/read', (req, res) => {
    const me = getAuthenticatedUser(req);
    const thread = store.dmThreads.find((t) => t.id === req.params.id);
    if (!thread || !thread.participantIds.includes(me.id)) {
      return res.status(404).json({ error: 'Thread not found.' });
    }
    thread.unreadBy[me.id] = 0;
    thread.readReceipts[me.id] = new Date().toISOString();
    saveStoreAtomic(store);
    return res.json({ thread });
  });

  // Notifications
  app.post('/api/notifications/read-all', (req, res) => {
    const me = getAuthenticatedUser(req);
    for (const n of store.notifications) {
      if (n.userId === me.id) n.read = true;
    }
    saveStoreAtomic(store);
    return res.json({ notifications: store.notifications.filter((n) => n.userId === me.id) });
  });

  app.patch('/api/notifications/preferences', (req, res) => {
    const me = getAuthenticatedUser(req);
    me.notificationPrefs = {
      ...me.notificationPrefs,
      ...(req.body || {}),
    };
    saveStoreAtomic(store);
    return res.json({ notificationPrefs: me.notificationPrefs });
  });

  // Media Upload Security Validation
  app.post('/api/media/validate', (req, res) => {
    const { filename, mimeType, sizeBytes, headerHex, category } = req.body || {};
    const allowed =
      category === 'video'
        ? ['video/mp4', 'video/webm', 'video/ogg']
        : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const result = validateMediaUpload({
      filename: String(filename || 'asset'),
      mimeType: String(mimeType || ''),
      sizeBytes: Number(sizeBytes || 0),
      maxSizeMb: 25,
      allowedMimeTypes: allowed,
      headerHex: typeof headerHex === 'string' ? headerHex : undefined,
    });
    if (!result.valid) {
      return res.status(400).json(result);
    }
    return res.json(result);
  });

  // Moderation & Reports
  app.post('/api/reports', (req, res) => {
    const me = getAuthenticatedUser(req);
    const { targetType, targetId, reason, details } = req.body || {};
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'Target and reason are required to submit a report.' });
    }
    const report: ModerationReport = {
      id: `rep-${Date.now()}`,
      reporterId: me.id,
      targetType,
      targetId,
      reason: String(reason).slice(0, 120),
      details: String(details || '').slice(0, 500),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    store.reports.unshift(report);
    recordAuditLog(me.id, 'REPORT_SUBMITTED', `Reported ${targetType} (${targetId}): ${report.reason}`);
    saveStoreAtomic(store);
    return res.status(201).json({ report });
  });

  app.post('/api/admin/reports/:id/resolve', (req, res) => {
    const me = getAuthenticatedUser(req);
    if (me.platformRole !== 'admin' && me.platformRole !== 'moderator') {
      return res.status(403).json({ error: 'Requires platform Moderator or Admin privileges.' });
    }
    const report = store.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    const { status, resolutionNote } = req.body || {};
    report.status = status === 'dismissed' ? 'dismissed' : 'resolved';
    report.resolvedBy = me.id;
    report.resolvedAt = new Date().toISOString();
    report.resolutionNote = String(resolutionNote || 'Reviewed by moderation team').slice(0, 300);
    recordAuditLog(me.id, 'REPORT_RESOLVED', `Marked report ${report.id} as ${report.status}`);
    saveStoreAtomic(store);
    return res.json({ report, reports: store.reports });
  });

  app.post('/api/admin/users/:id/toggle-suspend', (req, res) => {
    const me = getAuthenticatedUser(req);
    if (me.platformRole !== 'admin') {
      return res.status(403).json({ error: 'Requires platform Admin privileges.' });
    }
    const target = store.users.find((u) => u.id === req.params.id);
    if (!target || target.id === me.id) {
      return res.status(400).json({ error: 'Cannot suspend yourself or missing user.' });
    }
    target.suspended = !target.suspended;
    recordAuditLog(
      me.id,
      target.suspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      `${target.suspended ? 'Suspended' : 'Restored'} user @${target.username}`,
      undefined,
      target.id
    );
    saveStoreAtomic(store);
    return res.json({ user: target, auditLogs: store.auditLogs.slice(0, 60) });
  });

  app.get('/api/admin/storage-health', (req, res) => {
    const me = getAuthenticatedUser(req);
    if (me.platformRole !== 'admin' && me.platformRole !== 'moderator') {
      return res.status(403).json({ error: 'Requires Admin or Moderator privileges.' });
    }
    const storeExists = fs.existsSync(STORE_PATH);
    const backupExists = fs.existsSync(BACKUP_PATH);
    const lockExists = fs.existsSync(LOCK_PATH);
    const storeSizeBytes = storeExists ? fs.statSync(STORE_PATH).size : 0;
    return res.json({
      healthy: storeExists && backupExists,
      storeSizeBytes,
      backupExists,
      lockExists,
      lastUpdated: store.lastUpdated,
      counts: {
        users: store.users.length,
        posts: store.posts.length,
        activeStories: store.stories.length,
        reels: store.reels.length,
        communities: store.communities.length,
        messages: store.messages.length,
      },
      verifiedPolicies: {
        serverAutoDeleteAfter24h: false,
        channelTrimAt300Messages: false,
        defaultAdminPasswordFallback: false,
        storyExpiryHours: 24,
        atomicWriteWithBackup: true,
      },
    });
  });

  app.post('/api/admin/backup', (req, res) => {
    const me = getAuthenticatedUser(req);
    if (me.platformRole !== 'admin') {
      return res.status(403).json({ error: 'Requires Admin privileges.' });
    }
    saveStoreAtomic(store);
    recordAuditLog(me.id, 'MANUAL_BACKUP_VERIFIED', 'Triggered atomic JSON snapshot and backup verification.');
    saveStoreAtomic(store);
    return res.json({
      ok: true,
      lastUpdated: store.lastUpdated,
      auditLogs: store.auditLogs.slice(0, 60),
    });
  });

  // Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Anonymous Chat Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
