import React, { useState } from 'react';
import {
  CheckCheck,
  KeyRound,
  Lock,
  MessageSquarePlus,
  Send,
  Trash2,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import type { ChatMessage, DirectMessageThread, UserProfile } from '../types/platform';

interface DirectMessagesViewProps {
  dmThreads: DirectMessageThread[];
  selectedThreadId: string;
  onSelectThread: (id: string) => void;
  messages: ChatMessage[];
  currentUser: UserProfile;
  users: UserProfile[];
  typingUsers: Record<string, string[]>;
  onSendMessage: (payload: {
    threadId: string;
    content: string;
    passphrase?: string;
    passphraseHint?: string;
  }) => Promise<void>;
  onUnlockProtectedMessage: (messageId: string, passphrase: string) => Promise<string | null>;
  onReactMessage: (messageId: string, emoji: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onCreateDmThread: (participantIds: string[], name?: string) => Promise<void>;
  onMarkThreadRead: (threadId: string) => Promise<void>;
  onSendWsEvent: (event: Record<string, unknown>) => void;
}

export const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({
  dmThreads,
  selectedThreadId,
  onSelectThread,
  messages,
  currentUser,
  users,
  typingUsers,
  onSendMessage,
  onUnlockProtectedMessage,
  onReactMessage,
  onDeleteMessage,
  onCreateDmThread,
  onMarkThreadRead,
  onSendWsEvent,
}) => {
  const [msgText, setMsgText] = useState('');
  const [enablePassphrase, setEnablePassphrase] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [unlockPrompts, setUnlockPrompts] = useState<Record<string, string>>({});
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  const activeThread =
    dmThreads.find((t) => t.id === selectedThreadId) || dmThreads[0];

  const threadMessages = activeThread
    ? messages.filter((m) => m.threadId === activeThread.id)
    : [];

  const getThreadTitle = (thread: DirectMessageThread) => {
    if (thread.isGroup && thread.name) return thread.name;
    const otherIds = thread.participantIds.filter((id) => id !== currentUser.id);
    const otherNames = otherIds
      .map((id) => users.find((u) => u.id === id)?.displayName || id)
      .join(', ');
    return otherNames || 'Direct Conversation';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !activeThread) return;
    await onSendMessage({
      threadId: activeThread.id,
      content: msgText.trim(),
      passphrase: enablePassphrase ? passphraseInput.trim() : undefined,
    });
    onSendWsEvent({ type: 'typing:stop', threadId: activeThread.id });
    setMsgText('');
    setPassphraseInput('');
    setEnablePassphrase(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[680px]">
      {/* Left Conversation List */}
      <div className="lg:col-span-4 flex flex-col rounded-2xl border border-slate-800 bg-[#11141E] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h2 className="text-sm font-bold text-white">Direct &amp; Group Chats</h2>
            <p className="text-xs text-slate-400">Encrypted-at-rest participant threads</p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewChatModal(true)}
            aria-label="New Direct or Group Conversation"
            className="flex items-center gap-1.5 rounded-xl bg-[#6366F1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {dmThreads.map((t) => {
            const isSelected = t.id === activeThread?.id;
            const unread = t.unreadBy[currentUser.id] || 0;
            const title = getThreadTitle(t);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelectThread(t.id);
                  if (unread > 0) onMarkThreadRead(t.id);
                }}
                className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-white'
                    : 'border-slate-800/80 bg-[#0B0D13] text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    {t.isGroup && <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                    <p className="text-xs font-semibold truncate">{title}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {t.participantIds.length} participants · Updated{' '}
                    {new Date(t.lastMessageAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="rounded-md bg-indigo-500 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                    {unread} new
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Active Conversation Thread */}
      <div className="lg:col-span-8 flex flex-col rounded-2xl border border-slate-800 bg-[#11141E] overflow-hidden">
        {activeThread ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-bold text-white">{getThreadTitle(activeThread)}</h3>
                <p className="text-xs text-slate-400">
                  Private participant-verified thread · Supports passphrase-locked messages
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCheck className="h-4 w-4" />
                <span>Read Receipts Active</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 max-h-[500px]">
              {threadMessages.map((msg) => {
                const author = users.find((u) => u.id === msg.authorId);
                const isMine = msg.authorId === currentUser.id;
                const unlockedText = unlockedMap[msg.id];

                return (
                  <div
                    key={msg.id}
                    className={`rounded-2xl border p-4 ${
                      isMine
                        ? 'border-indigo-500/30 bg-indigo-950/20 ml-6'
                        : 'border-slate-800 bg-[#0B0D13] mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-white">
                        {author?.displayName || msg.authorId}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMine && (
                          <button
                            type="button"
                            onClick={() => onDeleteMessage(msg.id)}
                            aria-label="Delete DM message"
                            className="text-slate-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {msg.isPasswordProtected && !unlockedText ? (
                      <div className="mt-2.5 rounded-xl border border-indigo-500/40 bg-[#090B10] p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Passphrase-Locked Direct Message</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="password"
                            value={unlockPrompts[msg.id] || ''}
                            onChange={(e) =>
                              setUnlockPrompts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                            }
                            aria-label="Passphrase to unlock DM"
                            placeholder="Enter passphrase..."
                            className="rounded-lg border border-slate-700 bg-[#11141E] px-2.5 py-1 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const p = unlockPrompts[msg.id];
                              if (!p) return;
                              const res = await onUnlockProtectedMessage(msg.id, p);
                              if (res) setUnlockedMap((prev) => ({ ...prev, [msg.id]: res }));
                            }}
                            className="flex items-center gap-1 rounded-lg bg-[#6366F1] px-3 py-1 text-xs font-semibold text-white cursor-pointer"
                          >
                            <Unlock className="h-3 w-3" />
                            <span>Unlock</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-200">
                        {unlockedText || msg.content}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-2">
                      {msg.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => onReactMessage(msg.id, r.emoji)}
                          className="rounded-lg border border-slate-800 bg-[#141824] px-2 py-0.5 text-xs text-slate-200 cursor-pointer"
                        >
                          {r.emoji} {r.userIds.length}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onReactMessage(msg.id, '👍')}
                        className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        +👍
                      </button>
                    </div>
                  </div>
                );
              })}

              {(typingUsers[activeThread.id] || []).filter((id) => id !== currentUser.id).length >
                0 && (
                <p className="text-xs italic text-indigo-300">
                  Participant is typing...
                </p>
              )}
            </div>

            <form onSubmit={handleSend} className="border-t border-slate-800 bg-[#0B0D13] p-4 space-y-2">
              {enablePassphrase && (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={passphraseInput}
                    onChange={(e) => setPassphraseInput(e.target.value)}
                    placeholder="Passphrase for this DM (min 3 chars)..."
                    className="w-full rounded-lg border border-indigo-500/40 bg-[#11141E] px-3 py-1.5 text-xs text-white"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEnablePassphrase((p) => !p)}
                  aria-label="Lock DM with Passphrase"
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium cursor-pointer ${
                    enablePassphrase
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                      : 'border-slate-800 bg-[#141824] text-slate-300'
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                </button>
                <input
                  type="text"
                  value={msgText}
                  onChange={(e) => {
                    setMsgText(e.target.value);
                    onSendWsEvent({ type: 'typing:start', threadId: activeThread.id });
                  }}
                  aria-label="Write direct message"
                  placeholder={`Message ${getThreadTitle(activeThread)}...`}
                  className="flex-1 rounded-xl border border-slate-800 bg-[#141824] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-[#6366F1] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="p-12 text-center text-sm text-slate-400">
            Select or start a conversation.
          </div>
        )}
      </div>

      {/* Modal: Start New DM / Group Thread */}
      {showNewChatModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-dm-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#11141E] p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 id="new-dm-title" className="text-base font-semibold text-white">
                Start Direct or Group Conversation
              </h3>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                aria-label="Close New Chat Modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (selectedUserIds.length === 0) return;
                await onCreateDmThread(selectedUserIds, groupName.trim() || undefined);
                setSelectedUserIds([]);
                setGroupName('');
                setShowNewChatModal(false);
              }}
              className="mt-4 space-y-4"
            >
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {users
                  .filter((u) => u.id !== currentUser.id && !currentUser.blockedUsers.includes(u.id))
                  .map((u) => {
                    const checked = selectedUserIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0B0D13] p-3 text-xs text-slate-200 cursor-pointer"
                      >
                        <span>
                          {u.displayName} (@{u.username})
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedUserIds((prev) =>
                              checked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            )
                          }
                        />
                      </label>
                    );
                  })}
              </div>

              {selectedUserIds.length > 1 && (
                <div>
                  <label htmlFor="grp-name" className="block text-xs font-medium text-slate-300 mb-1">
                    Group Conversation Name
                  </label>
                  <input
                    id="grp-name"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Synth Design Crew"
                    className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedUserIds.length === 0}
                  className="rounded-lg bg-[#6366F1] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 cursor-pointer"
                >
                  Open Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
