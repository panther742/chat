import React, { useState } from 'react';
import {
  Hash,
  KeyRound,
  Lock,
  Megaphone,
  Pin,
  Plus,
  Send,
  Shield,
  Sparkles,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import type {
  AuditLogEntry,
  ChatMessage,
  CommunityRole,
  CommunityServer,
  UserProfile,
} from '../types/platform';
import { hasMinimumCommunityRole, canMemberAccessChannel } from '../lib/domainLogic';
import { VoiceRoomPanel } from './VoiceRoomPanel';

interface CommunitiesViewProps {
  communities: CommunityServer[];
  selectedCommunityId: string;
  selectedChannelId: string;
  onSelectCommunity: (id: string) => void;
  onSelectChannel: (id: string) => void;
  messages: ChatMessage[];
  currentUser: UserProfile;
  users: UserProfile[];
  voiceRooms: Record<string, string[]>;
  iceServers: RTCIceServer[];
  auditLogs: AuditLogEntry[];
  onSendMessage: (payload: {
    communityId: string;
    channelId: string;
    content: string;
    passphrase?: string;
    passphraseHint?: string;
  }) => Promise<void>;
  onUnlockProtectedMessage: (messageId: string, passphrase: string) => Promise<string | null>;
  onReactMessage: (messageId: string, emoji: string) => Promise<void>;
  onTogglePinMessage: (messageId: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onCreateCommunity: (payload: {
    name: string;
    description: string;
    isPrivate: boolean;
  }) => Promise<void>;
  onJoinCommunity: (payload: { communityId?: string; inviteCode?: string }) => Promise<void>;
  onCreateChannel: (
    communityId: string,
    payload: {
      name: string;
      category: string;
      topic: string;
      type: 'text' | 'voice' | 'announcement';
      minRoleToWrite: CommunityRole;
    }
  ) => Promise<void>;
  onManageMember: (
    communityId: string,
    targetUserId: string,
    action: 'set-role' | 'kick' | 'ban',
    role?: CommunityRole
  ) => Promise<void>;
  onSendWsEvent: (event: Record<string, unknown>) => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({
  communities,
  selectedCommunityId,
  selectedChannelId,
  onSelectCommunity,
  onSelectChannel,
  messages,
  currentUser,
  users,
  voiceRooms,
  iceServers,
  auditLogs,
  onSendMessage,
  onUnlockProtectedMessage,
  onReactMessage,
  onTogglePinMessage,
  onDeleteMessage,
  onCreateCommunity,
  onJoinCommunity,
  onCreateChannel,
  onManageMember,
  onSendWsEvent,
}) => {
  const [msgText, setMsgText] = useState('');
  const [enablePassphrase, setEnablePassphrase] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseHint, setPassphraseHint] = useState('');
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [unlockPrompts, setUnlockPrompts] = useState<Record<string, string>>({});
  const [unlockErrors, setUnlockErrors] = useState<Record<string, string>>({});
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [rightTab, setRightTab] = useState<'members' | 'audit'>('members');

  // Modals
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerDesc, setNewServerDesc] = useState('');
  const [newServerPrivate, setNewServerPrivate] = useState(false);

  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [chName, setChName] = useState('');
  const [chCategory, setChCategory] = useState('DESIGN & AUDIO LABS');
  const [chTopic, setChTopic] = useState('');
  const [chType, setChType] = useState<'text' | 'voice' | 'announcement'>('text');
  const [chMinRole, setChMinRole] = useState<CommunityRole>('member');

  const activeServer =
    communities.find((c) => c.id === selectedCommunityId) || communities[0];

  if (!activeServer) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-10 text-center">
        <p className="text-sm text-slate-300">No communities available.</p>
      </div>
    );
  }

  const activeChannel =
    activeServer.channels.find((ch) => ch.id === selectedChannelId) ||
    activeServer.channels[0];

  const myMemberRecord = activeServer.members.find((m) => m.userId === currentUser.id);
  const myRole = myMemberRecord?.role;
  const isAdminOrOwner = hasMinimumCommunityRole(myRole, 'admin');
  const isModOrHigher = hasMinimumCommunityRole(myRole, 'moderator');
  const canWrite = activeChannel
    ? canMemberAccessChannel(activeServer, activeChannel, currentUser.id, 'write')
    : false;

  const channelMessages = messages.filter(
    (m) =>
      m.communityId === activeServer.id &&
      m.channelId === activeChannel?.id &&
      (!showPinnedOnly || m.isPinned)
  );

  const serverAuditLogs = auditLogs.filter(
    (log) => !log.communityId || log.communityId === activeServer.id
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !activeChannel) return;
    await onSendMessage({
      communityId: activeServer.id,
      channelId: activeChannel.id,
      content: msgText.trim(),
      passphrase: enablePassphrase ? passphraseInput.trim() : undefined,
      passphraseHint: enablePassphrase ? passphraseHint.trim() : undefined,
    });
    setMsgText('');
    setPassphraseInput('');
    setPassphraseHint('');
    setEnablePassphrase(false);
  };

  const handleAttemptUnlock = async (msgId: string) => {
    const pass = unlockPrompts[msgId] || '';
    if (!pass.trim()) return;
    const result = await onUnlockProtectedMessage(msgId, pass.trim());
    if (result) {
      setUnlockedMap((prev) => ({ ...prev, [msgId]: result }));
      setUnlockErrors((prev) => ({ ...prev, [msgId]: '' }));
    } else {
      setUnlockErrors((prev) => ({ ...prev, [msgId]: 'Incorrect passphrase' }));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[720px]">
      {/* Left Column: Server Rail + Channel Tree */}
      <div className="lg:col-span-3 flex flex-col rounded-2xl border border-slate-800 bg-[#11141E] overflow-hidden">
        {/* Server Switcher Strip */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-[#0B0D13] p-3 overflow-x-auto">
          {communities.map((srv) => {
            const isSelected = srv.id === activeServer.id;
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => {
                  onSelectCommunity(srv.id);
                  if (srv.channels[0]) onSelectChannel(srv.channels[0].id);
                }}
                aria-label={`Select server ${srv.name}`}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#6366F1] text-white ring-2 ring-indigo-400/60'
                    : 'bg-[#161A29] text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {srv.iconText}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCreateServer(true)}
            aria-label="Create New Community Server"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-300 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowJoinByCode(true)}
            aria-label="Join Server by Invite Code"
            className="flex h-10 px-2.5 shrink-0 items-center gap-1 rounded-xl border border-slate-800 bg-[#161A29] text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
            <span>Join</span>
          </button>
        </div>

        {/* Active Server Header */}
        <div className="border-b border-slate-800/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white truncate">{activeServer.name}</h2>
            {!myMemberRecord && !activeServer.isPrivate && (
              <button
                type="button"
                onClick={() => onJoinCommunity({ communityId: activeServer.id })}
                className="rounded-lg bg-[#6366F1] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
              >
                Join Server
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400 line-clamp-2">{activeServer.description}</p>
          {activeServer.invites[0] && (
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>INVITE: {activeServer.invites[0].code}</span>
              <span>{activeServer.members.length} members</span>
            </div>
          )}
        </div>

        {/* Channel Categories List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {activeServer.categories.map((cat) => {
            const catChannels = activeServer.channels.filter((c) => c.category === cat);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[11px] font-semibold tracking-wider text-slate-400">
                    {cat}
                  </span>
                  {isAdminOrOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setChCategory(cat);
                        setShowCreateChannel(true);
                      }}
                      aria-label={`Add channel to ${cat}`}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {catChannels.map((ch) => {
                    const isSelected = ch.id === activeChannel?.id;
                    const voiceCount = (voiceRooms[ch.id] || []).length;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => onSelectChannel(ch.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/15 text-white border border-indigo-500/40'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {ch.type === 'voice' ? (
                            <Volume2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : ch.type === 'announcement' ? (
                            <Megaphone className="h-4 w-4 text-amber-400 shrink-0" />
                          ) : (
                            <Hash className="h-4 w-4 text-indigo-400 shrink-0" />
                          )}
                          <span className="truncate">{ch.name}</span>
                        </div>
                        {ch.type === 'voice' && voiceCount > 0 && (
                          <span className="text-[11px] text-emerald-400 font-mono tabular-nums">
                            {voiceCount} live
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Column: Active Channel Chat or WebRTC Voice Stage */}
      <div className="lg:col-span-6 flex flex-col rounded-2xl border border-slate-800 bg-[#11141E] overflow-hidden">
        {activeChannel?.type === 'voice' ? (
          <VoiceRoomPanel
            channel={activeChannel}
            currentUser={currentUser}
            users={users}
            activeParticipantIds={voiceRooms[activeChannel.id] || []}
            iceServers={iceServers}
            onSendWsEvent={onSendWsEvent}
            onLeaveVoice={() => {
              const firstText = activeServer.channels.find((c) => c.type !== 'voice');
              if (firstText) onSelectChannel(firstText.id);
            }}
          />
        ) : (
          <>
            {/* Channel Top Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-5 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-indigo-400 shrink-0" />
                  <h3 className="text-sm font-bold text-white truncate">
                    {activeChannel?.name}
                  </h3>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400">
                    Min Write Role: {activeChannel?.permissions.minRoleToWrite}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{activeChannel?.topic}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowPinnedOnly((p) => !p)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  showPinnedOnly
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                    : 'border-slate-800 bg-[#0B0D13] text-slate-300 hover:text-white'
                }`}
              >
                <Pin className="h-3.5 w-3.5" />
                <span>{showPinnedOnly ? 'Showing Pinned' : 'Pinned Messages'}</span>
              </button>
            </div>

            {/* Channel Message Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[520px]">
              {channelMessages.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-slate-300">
                    {showPinnedOnly
                      ? 'No pinned messages in this channel.'
                      : `Welcome to the start of #${activeChannel?.name}.`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    All messages are persisted atomically with zero automatic 300-message trimming.
                  </p>
                </div>
              ) : (
                channelMessages.map((msg) => {
                  const author = users.find((u) => u.id === msg.authorId);
                  const unlockedText = unlockedMap[msg.id];
                  const canDeleteMsg =
                    msg.authorId === currentUser.id ||
                    isModOrHigher ||
                    currentUser.platformRole === 'admin';

                  return (
                    <div
                      key={msg.id}
                      className="group rounded-xl border border-slate-800/80 bg-[#0B0D13] p-4 transition hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={author?.avatarUrl}
                            alt={author?.displayName || 'Member'}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-white">
                                {author?.displayName || msg.authorId}
                              </span>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="text-slate-400 tabular-nums">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {msg.isPinned && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">·</span>
                                  <span className="text-amber-400 font-medium">Pinned</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {isModOrHigher && (
                            <button
                              type="button"
                              onClick={() => onTogglePinMessage(msg.id)}
                              aria-label={msg.isPinned ? 'Unpin message' : 'Pin message'}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-300 cursor-pointer"
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDeleteMsg && (
                            <button
                              type="button"
                              onClick={() => onDeleteMessage(msg.id)}
                              aria-label="Delete message"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-950/60 hover:text-red-300 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Message Body or Password-Protected AES-256-GCM Lock */}
                      {msg.isPasswordProtected && !unlockedText ? (
                        <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Password-Protected Message (AES-256-GCM Encrypted)</span>
                          </div>
                          {msg.encryptedPayload?.hint && (
                            <p className="mt-1 text-xs text-slate-400">
                              Passphrase Hint: <span className="text-slate-200">{msg.encryptedPayload.hint}</span>
                            </p>
                          )}
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <input
                              type="password"
                              value={unlockPrompts[msg.id] || ''}
                              onChange={(e) =>
                                setUnlockPrompts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                              }
                              aria-label="Enter passphrase to unlock message"
                              placeholder="Enter passphrase (e.g. synth2026)..."
                              className="rounded-lg border border-slate-700 bg-[#090B10] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAttemptUnlock(msg.id)}
                              className="flex items-center gap-1.5 rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              <span>Unlock</span>
                            </button>
                          </div>
                          {unlockErrors[msg.id] && (
                            <p className="mt-1.5 text-xs text-red-400">{unlockErrors[msg.id]}</p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2.5 text-sm text-slate-200 leading-relaxed">
                          {unlockedText ? (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-emerald-200">
                              <p className="text-[11px] font-semibold text-emerald-400 mb-1">
                                Decrypted Message Content:
                              </p>
                              <p>{unlockedText}</p>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                      )}

                      {/* Reactions Row */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {msg.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => onReactMessage(msg.id, r.emoji)}
                            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#141824] px-2 py-1 text-xs text-slate-200 hover:border-indigo-500/50 cursor-pointer"
                          >
                            <span>{r.emoji}</span>
                            <span className="tabular-nums text-slate-400">{r.userIds.length}</span>
                          </button>
                        ))}
                        {['🔥', '⚡', '👍'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => onReactMessage(msg.id, emoji)}
                            aria-label={`React with ${emoji}`}
                            className="rounded-lg border border-transparent px-1.5 py-0.5 text-xs text-slate-500 hover:border-slate-800 hover:text-slate-300 cursor-pointer"
                          >
                            +{emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSend} className="border-t border-slate-800 bg-[#0B0D13] p-4">
              {!canWrite ? (
                <p className="text-xs text-amber-300">
                  Read-only channel for your current role ({myRole || 'guest'}). Minimum role required to post: {activeChannel?.permissions.minRoleToWrite}.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {enablePassphrase && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-3">
                      <div>
                        <label className="block text-[11px] font-medium text-indigo-300 mb-1">
                          Message Passphrase (min 3 chars)
                        </label>
                        <input
                          type="password"
                          value={passphraseInput}
                          onChange={(e) => setPassphraseInput(e.target.value)}
                          placeholder="Secret passphrase..."
                          className="w-full rounded-lg border border-slate-700 bg-[#0B0D13] px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-indigo-300 mb-1">
                          Optional Hint
                        </label>
                        <input
                          type="text"
                          value={passphraseHint}
                          onChange={(e) => setPassphraseHint(e.target.value)}
                          placeholder="Hint for collaborators..."
                          className="w-full rounded-lg border border-slate-700 bg-[#0B0D13] px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEnablePassphrase((p) => !p)}
                      aria-label="Toggle Password Protection for this message"
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition cursor-pointer shrink-0 ${
                        enablePassphrase
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-slate-800 bg-[#141824] text-slate-300 hover:text-white'
                      }`}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Lock</span>
                    </button>

                    <input
                      type="text"
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      aria-label={`Message #${activeChannel?.name}`}
                      placeholder={`Message #${activeChannel?.name || 'channel'}...`}
                      className="flex-1 rounded-xl border border-slate-800 bg-[#141824] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />

                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-xl bg-[#6366F1] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#4F46E5] transition cursor-pointer shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </>
        )}
      </div>

      {/* Right Column: Member Roles & Audit Logs */}
      <div className="lg:col-span-3 flex flex-col rounded-2xl border border-slate-800 bg-[#11141E] overflow-hidden">
        <div className="flex border-b border-slate-800 bg-[#0B0D13] p-1.5">
          <button
            type="button"
            onClick={() => setRightTab('members')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
              rightTab === 'members' ? 'bg-[#161A29] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Members ({activeServer.members.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setRightTab('audit')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
              rightTab === 'audit' ? 'bg-[#161A29] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Audit Log</span>
          </button>
        </div>

        {rightTab === 'members' ? (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {activeServer.members.map((member) => {
              const u = users.find((usr) => usr.id === member.userId);
              if (!u) return null;
              return (
                <div
                  key={member.userId}
                  className="rounded-xl border border-slate-800/80 bg-[#0B0D13] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {u.displayName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          @{u.username} · <span className="text-indigo-300">{member.role}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {isAdminOrOwner && member.userId !== activeServer.ownerId && (
                    <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                      <select
                        aria-label={`Assign role for ${u.displayName}`}
                        value={member.role}
                        onChange={(e) =>
                          onManageMember(
                            activeServer.id,
                            member.userId,
                            'set-role',
                            e.target.value as CommunityRole
                          )
                        }
                        className="flex-1 rounded-lg border border-slate-800 bg-[#141824] px-2 py-1 text-[11px] text-slate-200"
                      >
                        <option value="member">member</option>
                        <option value="moderator">moderator</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => onManageMember(activeServer.id, member.userId, 'kick')}
                        className="rounded-lg border border-slate-800 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-950/50 cursor-pointer"
                      >
                        Kick
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {serverAuditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-800/80 bg-[#0B0D13] p-3 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-indigo-300 font-mono">
                  <span>{log.action}</span>
                  <span className="tabular-nums text-slate-500">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-1 text-slate-300 leading-snug">{log.metadataSummary}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Server */}
      {showCreateServer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-server-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#11141E] p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 id="create-server-title" className="text-base font-semibold text-white">
                Create New Community Server
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateServer(false)}
                aria-label="Close Create Server Modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newServerName.trim()) return;
                await onCreateCommunity({
                  name: newServerName.trim(),
                  description: newServerDesc.trim(),
                  isPrivate: newServerPrivate,
                });
                setNewServerName('');
                setNewServerDesc('');
                setShowCreateServer(false);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label htmlFor="srv-name" className="block text-xs font-medium text-slate-300 mb-1">
                  Server Name
                </label>
                <input
                  id="srv-name"
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="e.g. Acoustic Engineering Guild"
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="srv-desc" className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  id="srv-desc"
                  rows={2}
                  value={newServerDesc}
                  onChange={(e) => setNewServerDesc(e.target.value)}
                  placeholder="What does your community collaborate on?"
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newServerPrivate}
                  onChange={(e) => setNewServerPrivate(e.target.checked)}
                />
                <span>Private Community (Requires Invite Code to join or view)</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateServer(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                >
                  Create Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Server by Invite Code */}
      {showJoinByCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-code-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#11141E] p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 id="join-code-title" className="text-base font-semibold text-white">
                Join Community by Invite Code
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinByCode(false)}
                aria-label="Close Join Modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setJoinError('');
                try {
                  await onJoinCommunity({ inviteCode: inviteCodeInput.trim() });
                  setInviteCodeInput('');
                  setShowJoinByCode(false);
                } catch (err) {
                  setJoinError(err instanceof Error ? err.message : 'Invalid invite code.');
                }
              }}
              className="mt-4 space-y-3"
            >
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="e.g. SYNTH-2026"
                aria-label="Invite Code"
                className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
              {joinError && <p className="text-xs text-red-400">{joinError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinByCode(false)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#6366F1] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                >
                  Join Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Channel */}
      {showCreateChannel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-channel-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#11141E] p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 id="create-channel-title" className="text-base font-semibold text-white">
                Create Channel in {activeServer.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateChannel(false)}
                aria-label="Close Create Channel Modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!chName.trim()) return;
                await onCreateChannel(activeServer.id, {
                  name: chName.trim(),
                  category: chCategory,
                  topic: chTopic.trim(),
                  type: chType,
                  minRoleToWrite: chMinRole,
                });
                setChName('');
                setChTopic('');
                setShowCreateChannel(false);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label htmlFor="ch-name" className="block text-xs font-medium text-slate-300 mb-1">
                  Channel Name
                </label>
                <input
                  id="ch-name"
                  type="text"
                  value={chName}
                  onChange={(e) => setChName(e.target.value)}
                  placeholder="e.g. acoustics-research"
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="ch-type" className="block text-xs font-medium text-slate-300 mb-1">
                    Channel Type
                  </label>
                  <select
                    id="ch-type"
                    value={chType}
                    onChange={(e) => setChType(e.target.value as 'text' | 'voice' | 'announcement')}
                    className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white"
                  >
                    <option value="text">Text Channel</option>
                    <option value="voice">WebRTC Voice/Video</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ch-role" className="block text-xs font-medium text-slate-300 mb-1">
                    Min Write Role
                  </label>
                  <select
                    id="ch-role"
                    value={chMinRole}
                    onChange={(e) => setChMinRole(e.target.value as CommunityRole)}
                    className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white"
                  >
                    <option value="member">member</option>
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="ch-topic" className="block text-xs font-medium text-slate-300 mb-1">
                  Channel Topic
                </label>
                <input
                  id="ch-topic"
                  type="text"
                  value={chTopic}
                  onChange={(e) => setChTopic(e.target.value)}
                  placeholder="Channel purpose and guidelines..."
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#6366F1] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
