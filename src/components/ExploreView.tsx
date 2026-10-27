import React, { useState } from 'react';
import { Compass, Film, Hash, Search, Users } from 'lucide-react';
import type {
  CommunityServer,
  ReelItem,
  SocialPost,
  UserProfile,
} from '../types/platform';

interface ExploreViewProps {
  users: UserProfile[];
  currentUser: UserProfile;
  posts: SocialPost[];
  reels: ReelItem[];
  communities: CommunityServer[];
  onOpenProfile: (userId: string) => void;
  onOpenCommunity: (communityId: string, channelId?: string) => void;
  onToggleFollow: (userId: string) => Promise<void>;
  onNavigateReels: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  users,
  currentUser,
  posts,
  reels,
  communities,
  onOpenProfile,
  onOpenCommunity,
  onToggleFollow,
  onNavigateReels,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'users' | 'communities' | 'posts' | 'reels'>('all');

  const q = query.trim().toLowerCase();

  const visibleUsers = users.filter((u) => {
    if (currentUser.blockedUsers.includes(u.id)) return false;
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.bio.toLowerCase().includes(q)
    );
  });

  const visibleCommunities = communities.filter((c) => {
    if (c.isPrivate && !c.members.some((m) => m.userId === currentUser.id)) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.channels.some((ch) => ch.name.toLowerCase().includes(q))
    );
  });

  const visiblePosts = posts.filter((p) => {
    if (currentUser.blockedUsers.includes(p.authorId)) return false;
    const author = users.find((u) => u.id === p.authorId);
    if (author?.isPrivate && author.id !== currentUser.id && !author.followers.includes(currentUser.id)) {
      return false;
    }
    if (!q) return true;
    return (
      p.caption.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const visibleReels = reels.filter((r) => {
    if (currentUser.blockedUsers.includes(r.authorId)) return false;
    if (!q) return true;
    return (
      r.caption.toLowerCase().includes(q) ||
      r.audioTrackTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Explore &amp; Discovery</h1>
            <p className="text-xs text-slate-400">
              Search creators, public communities, channels, posts, and studio reels (enforces privacy &amp; block lists)
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search users, communities, posts, and reels"
              placeholder="Search @creators, #tags, servers..."
              className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Interactive Filter Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl bg-[#0B0D13] p-1.5 border border-slate-800/80">
          {(
            [
              { id: 'all', label: 'All Discovery' },
              { id: 'communities', label: `Communities (${visibleCommunities.length})` },
              { id: 'users', label: `Creators (${visibleUsers.length})` },
              { id: 'posts', label: `Posts (${visiblePosts.length})` },
              { id: 'reels', label: `Reels (${visibleReels.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                category === tab.id
                  ? 'bg-[#6366F1] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Communities Discovery */}
      {(category === 'all' || category === 'communities') && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-400" />
            <span>Discoverable Communities &amp; Accessible Channels</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleCommunities.map((srv) => (
              <div
                key={srv.id}
                className="rounded-2xl border border-slate-800 bg-[#11141E] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6366F1] text-sm font-bold text-white">
                        {srv.iconText}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{srv.name}</h3>
                        <p className="text-xs text-slate-400 tabular-nums">
                          {srv.members.length} members · {srv.channels.length} channels
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCommunity(srv.id)}
                      className="rounded-xl bg-[#6366F1] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Open Server
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-300 leading-relaxed">{srv.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                  {srv.channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => onOpenCommunity(srv.id, ch.id)}
                      className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B0D13] px-2.5 py-1 text-xs text-slate-300 hover:border-indigo-500/50 hover:text-white cursor-pointer"
                    >
                      <Hash className="h-3 w-3 text-indigo-400" />
                      <span>{ch.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Creators / Users */}
      {(category === 'all' || category === 'users') && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" />
            <span>Creators &amp; Engineers</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleUsers.map((u) => {
              const isMe = u.id === currentUser.id;
              const isFollowing = currentUser.following.includes(u.id);
              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-slate-800 bg-[#11141E] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        referrerPolicy="no-referrer"
                        className="h-11 w-11 rounded-full object-cover border border-indigo-500/40"
                      />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenProfile(u.id)}
                          className="text-sm font-bold text-white hover:underline truncate block cursor-pointer"
                        >
                          {u.displayName}
                        </button>
                        <p className="text-xs text-slate-400 truncate">
                          @{u.username} {u.isPrivate ? '· Private' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-xs text-slate-300 line-clamp-2">{u.bio}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400 tabular-nums">
                      {u.followers.length} followers
                    </span>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => onToggleFollow(u.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          isFollowing
                            ? 'border border-slate-700 bg-[#0B0D13] text-slate-200'
                            : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Public Reels & Posts */}
      {(category === 'all' || category === 'reels' || category === 'posts') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Film className="h-4 w-4 text-indigo-400" />
              <span>Discoverable Posts &amp; Studio Reels</span>
            </h2>
            <button
              type="button"
              onClick={onNavigateReels}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              Open Full Reels Player →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visiblePosts.map((post) => {
              const author = users.find((u) => u.id === post.authorId);
              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-slate-800 bg-[#11141E] overflow-hidden flex flex-col justify-between"
                >
                  {post.mediaUrls[0] && (
                    <img
                      src={post.mediaUrls[0]}
                      alt={post.caption}
                      referrerPolicy="no-referrer"
                      className="h-44 w-full object-cover"
                    />
                  )}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                      {post.caption}
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>@{author?.username}</span>
                      <span className="tabular-nums">
                        {post.likes.length} likes · {post.comments.length} comments
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
