import React, { useState } from 'react';
import {
  Bookmark,
  Clock,
  Hash,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Radio,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  ChatMessage,
  CommunityServer,
  PulseRoom,
  SocialPost,
  StoryItem,
  UserProfile,
} from '../types/platform';
import { filterAndRankFeed } from '../lib/domainLogic';
import { POST_MEDIA_ASSETS } from '../utils/visualAssets';

interface FeedViewProps {
  posts: SocialPost[];
  stories: StoryItem[];
  currentUser: UserProfile;
  users: UserProfile[];
  communities: CommunityServer[];
  pulseRooms: PulseRoom[];
  messages: ChatMessage[];
  onOpenStoryViewer: (index: number) => void;
  onOpenCreateStory: () => void;
  onCreatePost: (payload: {
    caption: string;
    mediaUrls: string[];
    tags: string[];
    linkedCommunityId?: string;
    linkedChannelId?: string;
    createPulseRoom?: boolean;
  }) => Promise<void>;
  onLikePost: (postId: string) => Promise<void>;
  onSavePost: (postId: string) => Promise<void>;
  onCommentPost: (postId: string, content: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onOpenProfile: (userId: string) => void;
  onOpenCommunityChannel: (communityId: string, channelId?: string) => void;
  onSendPulseMessage: (pulseRoomId: string, content: string) => Promise<void>;
}

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  stories,
  currentUser,
  users,
  communities,
  pulseRooms,
  messages,
  onOpenStoryViewer,
  onOpenCreateStory,
  onCreatePost,
  onLikePost,
  onSavePost,
  onDeletePost,
  onCommentPost,
  onOpenProfile,
  onOpenCommunityChannel,
  onSendPulseMessage,
}) => {
  const [feedMode, setFeedMode] = useState<'unified' | 'following' | 'communities' | 'latest'>(
    'unified'
  );
  const [tagFilter, setTagFilter] = useState<string>('all');

  // Composer state
  const [caption, setCaption] = useState('');
  const [selectedMediaPreset, setSelectedMediaPreset] = useState<
    'none' | 'architecture' | 'synth' | 'topology' | 'custom'
  >('none');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('architecture, audio');
  const [linkedCommunityId, setLinkedCommunityId] = useState('');
  const [linkedChannelId, setLinkedChannelId] = useState('');
  const [attachPulseRoom, setAttachPulseRoom] = useState(false);
  const [composerError, setComposerError] = useState('');
  const [composerSuccess, setComposerSuccess] = useState('');

  // Comment inputs & expanded Pulse Room per post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [activePulsePostId, setActivePulsePostId] = useState<string | null>(null);
  const [pulseChatInput, setPulseChatInput] = useState('');

  const joinedCommunityIds = communities
    .filter((c) => c.members.some((m) => m.userId === currentUser.id))
    .map((c) => c.id);

  const rankedPosts = filterAndRankFeed({
    posts,
    viewerId: currentUser.id,
    followingIds: currentUser.following,
    joinedCommunityIds,
    blockedUserIds: currentUser.blockedUsers,
    mode: feedMode,
    tagFilter,
  });

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setComposerError('Image exceeds 15 MB upload limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomImageUrl(reader.result);
        setSelectedMediaPreset('custom');
        setComposerError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      setComposerError('Please write a post caption before publishing.');
      return;
    }
    setComposerError('');
    const mediaUrls: string[] = [];
    if (selectedMediaPreset === 'architecture') mediaUrls.push(POST_MEDIA_ASSETS.architectureStudio);
    if (selectedMediaPreset === 'synth') mediaUrls.push(POST_MEDIA_ASSETS.modularSynth);
    if (selectedMediaPreset === 'topology') mediaUrls.push(POST_MEDIA_ASSETS.spatialTopology);
    if (selectedMediaPreset === 'custom' && customImageUrl) mediaUrls.push(customImageUrl);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    await onCreatePost({
      caption: caption.trim(),
      mediaUrls,
      tags: parsedTags,
      linkedCommunityId: linkedCommunityId || undefined,
      linkedChannelId: linkedChannelId || undefined,
      createPulseRoom: attachPulseRoom,
    });

    setCaption('');
    setSelectedMediaPreset('none');
    setCustomImageUrl('');
    setAttachPulseRoom(false);
    setComposerSuccess('Post published to feed and persisted atomically.');
    setTimeout(() => setComposerSuccess(''), 3500);
  };

  const selectedServerForLink = communities.find((c) => c.id === linkedCommunityId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Feed Column */}
      <div className="lg:col-span-8 space-y-6">
        {/* Horizontal 24-Hour Stories Tray */}
        <section
          aria-label="24-Hour Ephemeral Stories"
          className="rounded-2xl border border-slate-800 bg-[#11141E] p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300">
              24-Hour Ephemeral Stories
            </span>
            <span className="text-[11px] text-slate-400">
              Auto-expires after 24h · Never affects servers or posts
            </span>
          </div>

          <div className="flex items-center gap-3.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={onOpenCreateStory}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-indigo-500/60 bg-[#0B0D13] text-indigo-400 group-hover:border-indigo-400 group-hover:text-white transition">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-medium text-slate-300">Add Story</span>
            </button>

            {stories.map((st, idx) => {
              const stAuthor = users.find((u) => u.id === st.authorId);
              const hasViewed = st.viewerIds.includes(currentUser.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onOpenStoryViewer(idx)}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <div
                    className={`p-0.5 rounded-2xl ${
                      hasViewed
                        ? 'bg-slate-700'
                        : 'bg-gradient-to-tr from-[#6366F1] to-[#A855F7]'
                    }`}
                  >
                    <img
                      src={stAuthor?.avatarUrl}
                      alt={`${stAuthor?.displayName || 'User'}'s Story`}
                      referrerPolicy="no-referrer"
                      className="h-15 w-15 rounded-[14px] border-2 border-[#0B0D13] object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-200 max-w-[72px] truncate">
                    {stAuthor?.displayName.split(' ')[0] || 'Story'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Post Composer with Community Channel Bridge & Pulse Room */}
        <section
          aria-label="Create Social Post"
          className="rounded-2xl border border-slate-800 bg-[#11141E] p-5"
        >
          <form onSubmit={handlePublishPost} className="space-y-4">
            <div className="flex items-start gap-3">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full object-cover border border-indigo-500/40 shrink-0"
              />
              <div className="flex-1">
                <textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  aria-label="Write a new social post"
                  placeholder={`Share an update, studio build, or link a community channel, ${currentUser.displayName.split(' ')[0]}...`}
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] p-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Media Selector Strip */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
                <span>Attach Media:</span>
              </span>
              {(
                [
                  { id: 'none', label: 'Text Only' },
                  { id: 'architecture', label: 'Studio Architecture' },
                  { id: 'synth', label: 'Modular Synth' },
                  { id: 'topology', label: 'Mesh Topology' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedMediaPreset(preset.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    selectedMediaPreset === preset.id
                      ? 'bg-[#6366F1] text-white'
                      : 'border border-slate-800 bg-[#0B0D13] text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <label className="flex items-center gap-1 rounded-lg border border-dashed border-slate-700 bg-[#0B0D13] px-2.5 py-1 text-xs text-slate-300 hover:border-indigo-500 cursor-pointer">
                <Upload className="h-3 w-3 text-indigo-400" />
                <span>{customImageUrl ? 'Custom Image Ready' : 'Upload File'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCustomImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Cross-Link to Community Channel & Pulse Room Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label htmlFor="post-comm-link" className="block text-[11px] text-slate-400 mb-1">
                  Link Community Server
                </label>
                <select
                  id="post-comm-link"
                  value={linkedCommunityId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setLinkedCommunityId(cid);
                    const srv = communities.find((c) => c.id === cid);
                    setLinkedChannelId(srv?.channels[0]?.id || '');
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="">No Linked Community</option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="post-ch-link" className="block text-[11px] text-slate-400 mb-1">
                  Link Discussion Channel
                </label>
                <select
                  id="post-ch-link"
                  disabled={!selectedServerForLink}
                  value={linkedChannelId}
                  onChange={(e) => setLinkedChannelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-2.5 py-1.5 text-xs text-slate-200 disabled:opacity-40"
                >
                  <option value="">Select Channel</option>
                  {selectedServerForLink?.channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="post-tags" className="block text-[11px] text-slate-400 mb-1">
                  Topic Tags
                </label>
                <input
                  id="post-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="architecture, synth"
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachPulseRoom}
                  onChange={(e) => setAttachPulseRoom(e.target.checked)}
                />
                <span>Attach Temporary Live Pulse Room (6-hour collaborative discussion)</span>
              </label>

              <button
                type="submit"
                className="rounded-xl bg-[#6366F1] px-5 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] transition cursor-pointer"
              >
                Publish Post
              </button>
            </div>

            {composerError && (
              <p role="alert" className="text-xs font-medium text-red-400">
                {composerError}
              </p>
            )}
            {composerSuccess && (
              <p role="status" className="text-xs font-medium text-emerald-400">
                {composerSuccess}
              </p>
            )}
          </form>
        </section>

        {/* Feed Mode Controller & Tag Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#11141E] p-3">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#0B0D13] p-1">
            {(
              [
                { id: 'unified', label: 'Unified Feed' },
                { id: 'following', label: 'Following' },
                { id: 'communities', label: 'Joined Communities' },
                { id: 'latest', label: 'Latest Chronological' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFeedMode(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  feedMode === m.id
                    ? 'bg-[#6366F1] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {['all', 'architecture', 'synth', 'systems'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(t)}
                className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                  tagFilter === t
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'all' ? 'All Topics' : `#${t}`}
              </button>
            ))}
          </div>
        </div>

        {/* Feed Posts List */}
        <div className="space-y-5">
          {rankedPosts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-12 text-center">
              <p className="text-sm font-semibold text-white">No Posts Match This Filter</p>
              <p className="mt-1 text-xs text-slate-400">
                Switch back to Unified Feed or publish a new post above.
              </p>
            </div>
          ) : (
            rankedPosts.map((post) => {
              const author = users.find((u) => u.id === post.authorId);
              const isLiked = post.likes.includes(currentUser.id);
              const isSaved = currentUser.savedPostIds.includes(post.id);
              const linkedServer = communities.find((c) => c.id === post.linkedCommunityId);
              const linkedChannel = linkedServer?.channels.find(
                (ch) => ch.id === post.linkedChannelId
              );
              const attachedPulse = pulseRooms.find((pr) => pr.id === post.pulseRoomId);
              const pulseMessages = attachedPulse
                ? messages.filter((m) => m.pulseRoomId === attachedPulse.id)
                : [];
              const isPulseOpen = activePulsePostId === post.id;

              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-800 bg-[#11141E] overflow-hidden"
                >
                  {/* Post Author Header */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(post.authorId)}
                        className="shrink-0 cursor-pointer"
                      >
                        <img
                          src={author?.avatarUrl}
                          alt={author?.displayName || 'Author'}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-full object-cover border border-indigo-500/40"
                        />
                      </button>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => onOpenProfile(post.authorId)}
                            className="text-sm font-bold text-white hover:underline cursor-pointer"
                          >
                            {author?.displayName || post.authorId}
                          </button>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400">@{author?.username}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400 tabular-nums flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(post.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Unboxed Metadata: Topic Tags & Community Bridge */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{post.tags.map((t) => `#${t}`).join(' · ')}</span>
                          {linkedServer && (
                            <>
                              <span aria-hidden="true">·</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenCommunityChannel(linkedServer.id, linkedChannel?.id)
                                }
                                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                              >
                                <Hash className="h-3 w-3" />
                                <span>
                                  {linkedServer.name}
                                  {linkedChannel ? ` / #${linkedChannel.name}` : ''}
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {(post.authorId === currentUser.id ||
                      currentUser.platformRole === 'admin') && (
                      <button
                        type="button"
                        onClick={() => onDeletePost(post.id)}
                        aria-label="Delete Post"
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-950/50 hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Post Caption */}
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-100 leading-relaxed">{post.caption}</p>
                  </div>

                  {/* Post Media */}
                  {post.mediaUrls.length > 0 && (
                    <div className="border-y border-slate-800/80 bg-[#090B10]">
                      <img
                        src={post.mediaUrls[0]}
                        alt={post.caption.slice(0, 80)}
                        referrerPolicy="no-referrer"
                        className="max-h-[440px] w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Interaction Bar */}
                  <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => onLikePost(post.id)}
                        aria-label={`Like post (${post.likes.length})`}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
                          isLiked ? 'text-rose-400' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                        <span className="tabular-nums">{post.likes.length} Likes</span>
                      </button>

                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                        <MessageCircle className="h-4 w-4 text-indigo-400" />
                        <span className="tabular-nums">{post.comments.length} Comments</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => onSavePost(post.id)}
                        aria-label={isSaved ? 'Unsave Post' : 'Bookmark Post'}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
                          isSaved ? 'text-indigo-400' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                        <span>{isSaved ? 'Saved' : 'Bookmark'}</span>
                      </button>
                    </div>

                    {attachedPulse && (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePulsePostId(isPulseOpen ? null : post.id)
                        }
                        className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
                      >
                        <Radio className="h-3.5 w-3.5" />
                        <span>
                          {isPulseOpen
                            ? 'Hide Live Pulse Room'
                            : `Open Live Pulse Room (${pulseMessages.length})`}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Original Feature: Attached Ephemeral Pulse Room Drawer */}
                  {attachedPulse && isPulseOpen && (
                    <div className="border-b border-slate-800 bg-[#0B0D13] p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-indigo-300">
                          Live Post Pulse Room: {attachedPulse.title}
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          {attachedPulse.activeParticipantIds.length} participants
                        </span>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {pulseMessages.map((pm) => {
                          const pmAuthor = users.find((u) => u.id === pm.authorId);
                          return (
                            <div
                              key={pm.id}
                              className="rounded-lg border border-slate-800/80 bg-[#11141E] p-2.5 text-xs"
                            >
                              <span className="font-semibold text-white">
                                {pmAuthor?.displayName || pm.authorId}:{' '}
                              </span>
                              <span className="text-slate-300">{pm.content}</span>
                            </div>
                          );
                        })}
                      </div>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!pulseChatInput.trim()) return;
                          await onSendPulseMessage(attachedPulse.id, pulseChatInput.trim());
                          setPulseChatInput('');
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={pulseChatInput}
                          onChange={(e) => setPulseChatInput(e.target.value)}
                          placeholder="Contribute to the live Pulse Room..."
                          className="flex-1 rounded-lg border border-slate-800 bg-[#11141E] px-3 py-1.5 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Comments List & Inline Comment Form */}
                  <div className="p-5 space-y-3 bg-[#0E111A]">
                    {post.comments.map((c) => {
                      const cAuthor = users.find((u) => u.id === c.authorId);
                      return (
                        <div key={c.id} className="text-xs flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-white">
                              {cAuthor?.displayName || c.authorId}
                            </span>{' '}
                            <span className="text-slate-300">{c.content}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                            {new Date(c.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })}

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const text = commentInputs[post.id] || '';
                        if (!text.trim()) return;
                        await onCommentPost(post.id, text.trim());
                        setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
                      }}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        aria-label="Write a comment"
                        placeholder="Add a comment..."
                        className="flex-1 rounded-xl border border-slate-800 bg-[#141824] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        aria-label="Submit comment"
                        className="flex items-center gap-1 rounded-xl bg-[#6366F1] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Reply</span>
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Active Communities & Original Differentiators */}
      <aside className="lg:col-span-4 space-y-5">
        <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-5">
          <h2 className="text-sm font-bold text-white">
            Connected Communities &amp; Live Channels
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Jump straight from the social feed into persistent Discord-style servers and WebRTC voice rooms.
          </p>

          <div className="mt-4 space-y-3">
            {communities.map((srv) => (
              <div
                key={srv.id}
                className="rounded-xl border border-slate-800 bg-[#0B0D13] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6366F1] text-xs font-bold text-white">
                      {srv.iconText}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{srv.name}</p>
                      <p className="text-[11px] text-slate-400 tabular-nums">
                        {srv.members.length} members · {srv.channels.length} channels
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCommunityChannel(srv.id, srv.channels[0]?.id)}
                    className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:border-indigo-500 hover:text-white cursor-pointer"
                  >
                    Enter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-5 space-y-2.5">
          <h3 className="text-sm font-bold text-white">
            Unified Feed Ranking &amp; Original Architecture
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>1. Unified Feed Mode:</strong> Ranks posts transparently using recency, followed creators, and joined community channels without fabricated metrics.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>2. Channel-Bridged Posts:</strong> Every post can link directly to a server channel so long-form community discourse continues in real time.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>3. Ephemeral Pulse Rooms:</strong> Creators can attach a live discussion room directly to a post or Reel.
          </p>
        </div>
      </aside>
    </div>
  );
};
