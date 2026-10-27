import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Compass,
  Film,
  Home,
  Layers,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import {
  loadBrandConfig,
  saveBrandConfig,
  type BrandConfig,
} from './config/appConfig';
import type {
  AppNotification,
  AuditLogEntry,
  ChatMessage,
  CommunityRole,
  CommunityServer,
  DirectMessageThread,
  ModerationReport,
  NotificationPreferences,
  PulseRoom,
  ReelItem,
  SocialPost,
  StoryItem,
  UserProfile,
} from './types/platform';
import { FeedView } from './components/FeedView';
import { ReelsView } from './components/ReelsView';
import { StoriesViewerModal, CreateStoryModal } from './components/StoriesModal';
import { CommunitiesView } from './components/CommunitiesView';
import { DirectMessagesView } from './components/DirectMessagesView';
import { ExploreView } from './components/ExploreView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { AdminPanelView } from './components/AdminPanelView';
import { AuthAndSettingsModal } from './components/AuthAndSettingsModal';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

type MainView =
  | 'feed'
  | 'reels'
  | 'explore'
  | 'communities'
  | 'chats'
  | 'notifications'
  | 'profile'
  | 'admin';

export default function App() {
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(() => loadBrandConfig());
  const [activeView, setActiveView] = useState<MainView>('feed');
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState('');

  // Authenticated state
  const [authToken, setAuthToken] = useState<string>(() => {
    try {
      return window.localStorage.getItem('anonchat_auth_token') || '';
    } catch {
      return '';
    }
  });
  const [activeUserIdHeader, setActiveUserIdHeader] = useState<string>('u-elena');

  // Platform entities from server
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [communities, setCommunities] = useState<CommunityServer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dmThreads, setDmThreads] = useState<DirectMessageThread[]>([]);
  const [pulseRooms, setPulseRooms] = useState<PulseRoom[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [voiceRooms, setVoiceRooms] = useState<Record<string, string[]>>({});
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
  ]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // Navigation selections
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('srv-architects');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ch-general');
  const [selectedDmThreadId, setSelectedDmThreadId] = useState<string>('dm-elena-marcus');
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string>('u-elena');

  // Modals
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-active-user-id': activeUserIdHeader,
        ...(options.headers as Record<string, string>),
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      return data;
    },
    [authToken, activeUserIdHeader]
  );

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await apiFetch('/api/bootstrap');
      setCurrentUser(data.currentUser);
      setUsers(data.users || []);
      setPosts(data.posts || []);
      setStories(data.stories || []);
      setReels(data.reels || []);
      setCommunities(data.communities || []);
      setMessages(data.messages || []);
      setDmThreads(data.dmThreads || []);
      setPulseRooms(data.pulseRooms || []);
      setNotifications(data.notifications || []);
      setReports(data.reports || []);
      setAuditLogs(data.auditLogs || []);
      setVoiceRooms(data.voiceRooms || {});
      if (data.webrtcConfig?.iceServers) {
        setIceServers(data.webrtcConfig.iceServers);
      }
      setErrorBanner('');
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Unable to sync platform state.'
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  // Real-time WebSocket connection with automatic reconnection
  useEffect(() => {
    let reconnectTimer: number | undefined;
    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'auth:identify',
            userId: currentUser?.id || activeUserIdHeader,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'post:created') {
            setPosts((prev) => {
              if (prev.some((p) => p.id === msg.payload.id)) return prev;
              return [msg.payload, ...prev];
            });
          } else if (msg.type === 'post:updated') {
            setPosts((prev) =>
              prev.map((p) => (p.id === msg.payload.id ? msg.payload : p))
            );
          } else if (msg.type === 'message:created') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.payload.id)) return prev;
              return [...prev, msg.payload];
            });
          } else if (msg.type === 'message:updated') {
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.payload.id ? msg.payload : m))
            );
          } else if (msg.type === 'message:deleted') {
            setMessages((prev) => prev.filter((m) => m.id !== msg.payload.id));
          } else if (msg.type === 'notification:created') {
            if (msg.payload.userId === (currentUser?.id || activeUserIdHeader)) {
              setNotifications((prev) => {
                if (prev.some((n) => n.id === msg.payload.id)) return prev;
                return [msg.payload, ...prev];
              });
            }
          } else if (msg.type === 'voice:state') {
            setVoiceRooms(msg.payload || {});
          } else if (msg.type === 'typing:start') {
            const key = msg.payload.threadId || msg.payload.channelId;
            if (key) {
              setTypingUsers((prev) => ({
                ...prev,
                [key]: Array.from(new Set([...(prev[key] || []), msg.payload.userId])),
              }));
            }
          } else if (msg.type === 'typing:stop') {
            const key = msg.payload.threadId || msg.payload.channelId;
            if (key) {
              setTypingUsers((prev) => ({
                ...prev,
                [key]: (prev[key] || []).filter((id) => id !== msg.payload.userId),
              }));
            }
          }
        } catch {
          // Ignore invalid JSON frames
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          reconnectTimer = window.setTimeout(connectWs, 2500);
        }
      };
    };

    connectWs();
    return () => {
      isUnmounted = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [currentUser?.id, activeUserIdHeader]);

  const sendWsEvent = useCallback((event: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0B0D13] text-slate-200 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#6366F1]/20 border border-indigo-500/40 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-lg font-bold text-white">{brandConfig.appName}</h1>
          <p className="text-xs text-slate-400">
            Loading unified social graph, communities, and real-time channels...
          </p>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const unreadDmCount = dmThreads.reduce(
    (sum, t) => sum + (t.unreadBy[currentUser.id] || 0),
    0
  );

  const profileTarget =
    users.find((u) => u.id === selectedProfileUserId) || currentUser;

  return (
    <div className="min-h-screen bg-[#0B0D13] text-[#F1F5F9] flex flex-col">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-slate-800/90 bg-[#0B0D13]/95 backdrop-blur-md px-6 py-3.5">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#feed"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('feed');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          {brandConfig.appName}
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Top Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300"
        >
          <button
            type="button"
            onClick={() => setActiveView('feed')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'feed' ? 'text-white underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Home Feed
          </button>
          <button
            type="button"
            onClick={() => setActiveView('reels')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'reels' ? 'text-white underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Reels
          </button>
          <button
            type="button"
            onClick={() => setActiveView('communities')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'communities' ? 'text-white underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Communities
          </button>
          <button
            type="button"
            onClick={() => setActiveView('chats')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'chats' ? 'text-white underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Chats {unreadDmCount > 0 ? `(${unreadDmCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('explore')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'explore' ? 'text-white underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Explore
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#6366F1] rounded-lg hover:bg-[#4F46E5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Account &amp; Brand Settings
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 mx-auto w-full max-w-[1440px] flex gap-6 px-4 sm:px-6 py-6 pb-20 md:pb-8">
        {/* Desktop Sidebar Navigation */}
        <aside
          aria-label="Workspace Sidebar Navigation"
          className="hidden md:flex w-60 shrink-0 flex-col justify-between rounded-2xl border border-slate-800 bg-[#11141E] p-4 h-fit sticky top-20"
        >
          <div className="space-y-1">
            {(
              [
                { id: 'feed', label: 'Home / Feed', icon: Home },
                { id: 'reels', label: 'Reels & Video', icon: Film },
                { id: 'explore', label: 'Explore & Search', icon: Compass },
                { id: 'communities', label: 'Servers & Channels', icon: Layers },
                {
                  id: 'chats',
                  label: `Direct Chats${unreadDmCount ? ` (${unreadDmCount})` : ''}`,
                  icon: MessageSquare,
                },
                {
                  id: 'notifications',
                  label: `Notifications${unreadNotifications ? ` (${unreadNotifications})` : ''}`,
                  icon: Bell,
                },
                { id: 'profile', label: 'My Profile', icon: User },
                { id: 'admin', label: 'Admin & Moderation', icon: ShieldCheck },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isSelected = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'profile') {
                      setSelectedProfileUserId(currentUser.id);
                    }
                    setActiveView(item.id);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#6366F1] text-white'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowCreateStoryModal(true)}
              className="mt-2 w-full flex items-center gap-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-2.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Publish 24h Story</span>
            </button>
          </div>

          {/* Current User Profile Card & PWA Install Prompt */}
          <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full object-cover border border-indigo-500/50"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser.displayName}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  @{currentUser.username} · {currentUser.platformRole}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                aria-label="Open Settings"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-1">
              <PWAInstallButton />
            </div>
          </div>
        </aside>

        {/* Main Viewport Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile Quick-Access Secondary Strip */}
          <div className="md:hidden mb-4 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveView('explore')}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'explore'
                  ? 'border-indigo-500 bg-[#6366F1] text-white'
                  : 'border-slate-800 bg-[#11141E] text-slate-300'
              }`}
            >
              Explore &amp; Search
            </button>
            <button
              type="button"
              onClick={() => setActiveView('notifications')}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'notifications'
                  ? 'border-indigo-500 bg-[#6366F1] text-white'
                  : 'border-slate-800 bg-[#11141E] text-slate-300'
              }`}
            >
              Notifications {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateStoryModal(true)}
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              + 24h Story
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'admin'
                  ? 'border-indigo-500 bg-[#6366F1] text-white'
                  : 'border-slate-800 bg-[#11141E] text-slate-300'
              }`}
            >
              Admin Console
            </button>
          </div>

          {errorBanner && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2.5 text-xs text-red-200"
            >
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner('')}
                className="underline ml-3 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeView === 'feed' && (
            <FeedView
              posts={posts}
              stories={stories}
              currentUser={currentUser}
              users={users}
              communities={communities}
              pulseRooms={pulseRooms}
              messages={messages}
              onOpenStoryViewer={(idx) => setStoryViewerIndex(idx)}
              onOpenCreateStory={() => setShowCreateStoryModal(true)}
              onCreatePost={async (payload) => {
                const res = await apiFetch('/api/posts', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                if (res.post) {
                  setPosts((prev) =>
                    prev.some((p) => p.id === res.post.id) ? prev : [res.post, ...prev]
                  );
                }
                if (res.pulseRooms) setPulseRooms(res.pulseRooms);
              }}
              onLikePost={async (postId) => {
                const res = await apiFetch(`/api/posts/${postId}/like`, { method: 'POST' });
                setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
              }}
              onSavePost={async (postId) => {
                const res = await apiFetch(`/api/posts/${postId}/save`, { method: 'POST' });
                setCurrentUser((prev) =>
                  prev ? { ...prev, savedPostIds: res.savedPostIds } : prev
                );
              }}
              onCommentPost={async (postId, content) => {
                const res = await apiFetch(`/api/posts/${postId}/comments`, {
                  method: 'POST',
                  body: JSON.stringify({ content }),
                });
                setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
              }}
              onDeletePost={async (postId) => {
                await apiFetch(`/api/posts/${postId}`, { method: 'DELETE' });
                setPosts((prev) => prev.filter((p) => p.id !== postId));
              }}
              onOpenProfile={(userId) => {
                setSelectedProfileUserId(userId);
                setActiveView('profile');
              }}
              onOpenCommunityChannel={(communityId, channelId) => {
                setSelectedCommunityId(communityId);
                if (channelId) setSelectedChannelId(channelId);
                setActiveView('communities');
              }}
              onSendPulseMessage={async (pulseRoomId, content) => {
                const res = await apiFetch('/api/messages', {
                  method: 'POST',
                  body: JSON.stringify({ pulseRoomId, content }),
                });
                if (res.message) {
                  setMessages((prev) =>
                    prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]
                  );
                }
              }}
            />
          )}

          {activeView === 'reels' && (
            <ReelsView
              reels={reels}
              currentUser={currentUser}
              users={users}
              communities={communities}
              onLikeReel={async (reelId) => {
                const res = await apiFetch(`/api/reels/${reelId}/like`, { method: 'POST' });
                setReels((prev) => prev.map((r) => (r.id === reelId ? res.reel : r)));
              }}
              onSaveReel={async (reelId) => {
                const res = await apiFetch(`/api/reels/${reelId}/save`, { method: 'POST' });
                setCurrentUser((prev) =>
                  prev ? { ...prev, savedReelIds: res.savedReelIds } : prev
                );
              }}
              onCommentReel={async (reelId, content) => {
                const res = await apiFetch(`/api/reels/${reelId}/comments`, {
                  method: 'POST',
                  body: JSON.stringify({ content }),
                });
                setReels((prev) => prev.map((r) => (r.id === reelId ? res.reel : r)));
              }}
              onCreateReel={async (payload) => {
                const res = await apiFetch('/api/reels', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                setReels((prev) => [res.reel, ...prev]);
              }}
              onDeleteReel={async (reelId) => {
                await apiFetch(`/api/reels/${reelId}`, { method: 'DELETE' });
                setReels((prev) => prev.filter((r) => r.id !== reelId));
              }}
              onNavigateToCommunity={(communityId) => {
                setSelectedCommunityId(communityId);
                setActiveView('communities');
              }}
            />
          )}

          {activeView === 'communities' && (
            <CommunitiesView
              communities={communities}
              selectedCommunityId={selectedCommunityId}
              selectedChannelId={selectedChannelId}
              onSelectCommunity={setSelectedCommunityId}
              onSelectChannel={setSelectedChannelId}
              messages={messages}
              currentUser={currentUser}
              users={users}
              voiceRooms={voiceRooms}
              iceServers={iceServers}
              auditLogs={auditLogs}
              onSendMessage={async (payload) => {
                const res = await apiFetch('/api/messages', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                if (res.message) {
                  setMessages((prev) =>
                    prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]
                  );
                }
              }}
              onUnlockProtectedMessage={async (messageId, passphrase) => {
                try {
                  const res = await apiFetch(`/api/messages/${messageId}/unlock`, {
                    method: 'POST',
                    body: JSON.stringify({ passphrase }),
                  });
                  return res.unlockedContent || null;
                } catch {
                  return null;
                }
              }}
              onReactMessage={async (messageId, emoji) => {
                const res = await apiFetch(`/api/messages/${messageId}/react`, {
                  method: 'POST',
                  body: JSON.stringify({ emoji }),
                });
                setMessages((prev) =>
                  prev.map((m) => (m.id === messageId ? res.message : m))
                );
              }}
              onTogglePinMessage={async (messageId) => {
                const res = await apiFetch(`/api/messages/${messageId}/pin`, {
                  method: 'POST',
                });
                setMessages((prev) =>
                  prev.map((m) => (m.id === messageId ? res.message : m))
                );
              }}
              onDeleteMessage={async (messageId) => {
                await apiFetch(`/api/messages/${messageId}`, { method: 'DELETE' });
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
              }}
              onCreateCommunity={async (payload) => {
                const res = await apiFetch('/api/communities', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                setCommunities((prev) => [...prev, res.community]);
                setSelectedCommunityId(res.community.id);
                if (res.community.channels[0]) {
                  setSelectedChannelId(res.community.channels[0].id);
                }
              }}
              onJoinCommunity={async (payload) => {
                const res = await apiFetch('/api/communities/join', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                setCommunities((prev) => {
                  const exists = prev.some((c) => c.id === res.community.id);
                  if (exists) {
                    return prev.map((c) => (c.id === res.community.id ? res.community : c));
                  }
                  return [...prev, res.community];
                });
                setSelectedCommunityId(res.community.id);
              }}
              onCreateChannel={async (communityId, payload) => {
                const res = await apiFetch(`/api/communities/${communityId}/channels`, {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                setCommunities((prev) =>
                  prev.map((c) => (c.id === communityId ? res.community : c))
                );
                setSelectedChannelId(res.channel.id);
              }}
              onManageMember={async (communityId, targetUserId, action, role) => {
                const res = await apiFetch(
                  `/api/communities/${communityId}/members/${targetUserId}`,
                  {
                    method: 'POST',
                    body: JSON.stringify({ action, role }),
                  }
                );
                setCommunities((prev) =>
                  prev.map((c) => (c.id === communityId ? res.community : c))
                );
                if (res.auditLogs) setAuditLogs(res.auditLogs);
              }}
              onSendWsEvent={sendWsEvent}
            />
          )}

          {activeView === 'chats' && (
            <DirectMessagesView
              dmThreads={dmThreads}
              selectedThreadId={selectedDmThreadId}
              onSelectThread={setSelectedDmThreadId}
              messages={messages}
              currentUser={currentUser}
              users={users}
              typingUsers={typingUsers}
              onSendMessage={async (payload) => {
                const res = await apiFetch('/api/messages', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                if (res.message) {
                  setMessages((prev) =>
                    prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]
                  );
                }
              }}
              onUnlockProtectedMessage={async (messageId, passphrase) => {
                try {
                  const res = await apiFetch(`/api/messages/${messageId}/unlock`, {
                    method: 'POST',
                    body: JSON.stringify({ passphrase }),
                  });
                  return res.unlockedContent || null;
                } catch {
                  return null;
                }
              }}
              onReactMessage={async (messageId, emoji) => {
                const res = await apiFetch(`/api/messages/${messageId}/react`, {
                  method: 'POST',
                  body: JSON.stringify({ emoji }),
                });
                setMessages((prev) =>
                  prev.map((m) => (m.id === messageId ? res.message : m))
                );
              }}
              onDeleteMessage={async (messageId) => {
                await apiFetch(`/api/messages/${messageId}`, { method: 'DELETE' });
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
              }}
              onCreateDmThread={async (participantIds, name) => {
                const res = await apiFetch('/api/dms', {
                  method: 'POST',
                  body: JSON.stringify({ participantIds, name }),
                });
                setDmThreads((prev) => {
                  if (prev.some((t) => t.id === res.thread.id)) return prev;
                  return [res.thread, ...prev];
                });
                setSelectedDmThreadId(res.thread.id);
              }}
              onMarkThreadRead={async (threadId) => {
                const res = await apiFetch(`/api/dms/${threadId}/read`, {
                  method: 'POST',
                });
                setDmThreads((prev) =>
                  prev.map((t) => (t.id === threadId ? res.thread : t))
                );
              }}
              onSendWsEvent={sendWsEvent}
            />
          )}

          {activeView === 'explore' && (
            <ExploreView
              users={users}
              currentUser={currentUser}
              posts={posts}
              reels={reels}
              communities={communities}
              onOpenProfile={(userId) => {
                setSelectedProfileUserId(userId);
                setActiveView('profile');
              }}
              onOpenCommunity={(communityId, channelId) => {
                setSelectedCommunityId(communityId);
                if (channelId) setSelectedChannelId(channelId);
                setActiveView('communities');
              }}
              onToggleFollow={async (targetUserId) => {
                const res = await apiFetch(`/api/users/${targetUserId}/follow`, {
                  method: 'POST',
                });
                setCurrentUser(res.currentUser);
                setUsers((prev) =>
                  prev.map((u) => {
                    if (u.id === res.currentUser.id) return res.currentUser;
                    if (u.id === res.targetUser.id) return res.targetUser;
                    return u;
                  })
                );
              }}
              onNavigateReels={() => setActiveView('reels')}
            />
          )}

          {activeView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              preferences={currentUser.notificationPrefs}
              onMarkAllRead={async () => {
                const res = await apiFetch('/api/notifications/read-all', {
                  method: 'POST',
                });
                setNotifications(res.notifications);
              }}
              onUpdatePreferences={async (patch: Partial<NotificationPreferences>) => {
                const res = await apiFetch('/api/notifications/preferences', {
                  method: 'PATCH',
                  body: JSON.stringify(patch),
                });
                setCurrentUser((prev) =>
                  prev ? { ...prev, notificationPrefs: res.notificationPrefs } : prev
                );
              }}
              onSelectNotificationTarget={(notif) => {
                if (notif.targetView === 'chats') setActiveView('chats');
                else if (notif.targetView === 'profile' && notif.targetId) {
                  setSelectedProfileUserId(notif.targetId);
                  setActiveView('profile');
                } else {
                  setActiveView('feed');
                }
              }}
            />
          )}

          {activeView === 'profile' && (
            <ProfileView
              profileUser={profileTarget}
              currentUser={currentUser}
              users={users}
              posts={posts}
              reels={reels}
              communities={communities}
              onUpdateOwnProfile={async (patch) => {
                const res = await apiFetch('/api/users/me', {
                  method: 'PATCH',
                  body: JSON.stringify(patch),
                });
                setCurrentUser(res.user);
                setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
              }}
              onToggleFollow={async (targetUserId) => {
                const res = await apiFetch(`/api/users/${targetUserId}/follow`, {
                  method: 'POST',
                });
                setCurrentUser(res.currentUser);
                setUsers((prev) =>
                  prev.map((u) => {
                    if (u.id === res.currentUser.id) return res.currentUser;
                    if (u.id === res.targetUser.id) return res.targetUser;
                    return u;
                  })
                );
              }}
              onToggleBlock={async (targetUserId) => {
                const res = await apiFetch(`/api/users/${targetUserId}/block`, {
                  method: 'POST',
                });
                setCurrentUser((prev) =>
                  prev ? { ...prev, blockedUsers: res.blockedUsers } : prev
                );
              }}
              onSubmitReport={async (payload) => {
                const res = await apiFetch('/api/reports', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                if (res.report) {
                  setReports((prev) => [res.report, ...prev]);
                }
              }}
              onOpenCommunity={(communityId) => {
                setSelectedCommunityId(communityId);
                setActiveView('communities');
              }}
              onSelectProfileUser={(userId) => setSelectedProfileUserId(userId)}
            />
          )}

          {activeView === 'admin' && (
            <AdminPanelView
              currentUser={currentUser}
              users={users}
              reports={reports}
              auditLogs={auditLogs}
              onResolveReport={async (reportId, status, resolutionNote) => {
                const res = await apiFetch(`/api/admin/reports/${reportId}/resolve`, {
                  method: 'POST',
                  body: JSON.stringify({ status, resolutionNote }),
                });
                setReports(res.reports);
              }}
              onToggleSuspendUser={async (userId) => {
                const res = await apiFetch(`/api/admin/users/${userId}/toggle-suspend`, {
                  method: 'POST',
                });
                setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
                if (res.auditLogs) setAuditLogs(res.auditLogs);
              }}
              onTriggerAtomicBackup={async () => {
                const res = await apiFetch('/api/admin/backup', { method: 'POST' });
                if (res.auditLogs) setAuditLogs(res.auditLogs);
              }}
              fetchStorageHealth={async () => {
                try {
                  return await apiFetch('/api/admin/storage-health');
                } catch {
                  return null;
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Compact Bottom Navigation Bar (<= 15% aggregate sticky height) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 items-center h-14 bg-[#0B0D13]/95 backdrop-blur-md border-t border-slate-800 px-2"
      >
        {(
          [
            { id: 'feed', label: 'Feed', icon: Home },
            { id: 'reels', label: 'Reels', icon: Film },
            { id: 'communities', label: 'Servers', icon: Layers },
            { id: 'chats', label: 'Chats', icon: MessageSquare },
            { id: 'profile', label: 'Profile', icon: User },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'profile') setSelectedProfileUserId(currentUser.id);
                setActiveView(tab.id);
              }}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition cursor-pointer ${
                isSelected ? 'text-[#6366F1]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <OfflineIndicator />

      {/* Full-Screen 24-Hour Story Viewer Modal */}
      {storyViewerIndex !== null && (
        <StoriesViewerModal
          stories={stories}
          initialIndex={storyViewerIndex}
          currentUser={currentUser}
          users={users}
          onClose={() => setStoryViewerIndex(null)}
          onDeleteStory={async (storyId) => {
            const res = await apiFetch(`/api/stories/${storyId}`, { method: 'DELETE' });
            setStories(res.stories);
          }}
          onMarkViewed={(storyId) => {
            apiFetch(`/api/stories/${storyId}/view`, { method: 'POST' })
              .then((res) => {
                setStories((prev) =>
                  prev.map((s) => (s.id === storyId ? res.story : s))
                );
              })
              .catch(() => {});
          }}
        />
      )}

      {/* Create 24-Hour Story Modal */}
      {showCreateStoryModal && (
        <CreateStoryModal
          onClose={() => setShowCreateStoryModal(false)}
          onCreateStory={async (payload) => {
            const res = await apiFetch('/api/stories', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            setStories(res.stories);
          }}
        />
      )}

      {/* Centralized Brand Configurator, Auth & Security Modal */}
      {showSettingsModal && (
        <AuthAndSettingsModal
          brandConfig={brandConfig}
          onUpdateBrandConfig={(patch) => {
            const updated = saveBrandConfig(patch);
            setBrandConfig(updated);
            document.title = `${updated.appName} — Social & Community Platform`;
          }}
          currentUser={currentUser}
          users={users}
          onSwitchActiveUser={(userId) => {
            setAuthToken('');
            try {
              window.localStorage.removeItem('anonchat_auth_token');
            } catch {
              // ignore
            }
            setActiveUserIdHeader(userId);
          }}
          onLogin={async (username, password) => {
            const res = await apiFetch('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({ username, password }),
            });
            setAuthToken(res.token);
            try {
              window.localStorage.setItem('anonchat_auth_token', res.token);
            } catch {
              // ignore
            }
            setActiveUserIdHeader(res.user.id);
          }}
          onRegister={async (payload) => {
            const res = await apiFetch('/api/auth/register', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            setAuthToken(res.token);
            try {
              window.localStorage.setItem('anonchat_auth_token', res.token);
            } catch {
              // ignore
            }
            setActiveUserIdHeader(res.user.id);
          }}
          onChangePassword={async (currentPassword, newPassword) => {
            await apiFetch('/api/auth/change-password', {
              method: 'POST',
              body: JSON.stringify({ currentPassword, newPassword }),
            });
          }}
          onDeleteAccount={async (confirmUsername) => {
            const res = await apiFetch('/api/users/me', {
              method: 'DELETE',
              body: JSON.stringify({ confirmUsername }),
            });
            setAuthToken('');
            if (res.nextUser) {
              setActiveUserIdHeader(res.nextUser.id);
            }
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}
