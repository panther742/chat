import React, { useState } from 'react';
import {
  Bookmark,
  Edit3,
  Flag,
  Globe,
  Grid,
  Lock,
  ShieldBan,
  Users,
  X,
} from 'lucide-react';
import type {
  CommunityServer,
  ReelItem,
  SocialPost,
  UserProfile,
} from '../types/platform';

interface ProfileViewProps {
  profileUser: UserProfile;
  currentUser: UserProfile;
  users: UserProfile[];
  posts: SocialPost[];
  reels: ReelItem[];
  communities: CommunityServer[];
  onUpdateOwnProfile: (patch: {
    displayName: string;
    bio: string;
    statusText: string;
    isPrivate: boolean;
  }) => Promise<void>;
  onToggleFollow: (userId: string) => Promise<void>;
  onToggleBlock: (userId: string) => Promise<void>;
  onSubmitReport: (payload: {
    targetType: 'user' | 'post' | 'reel' | 'message' | 'community';
    targetId: string;
    reason: string;
    details: string;
  }) => Promise<void>;
  onOpenCommunity: (communityId: string) => void;
  onSelectProfileUser: (userId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profileUser,
  currentUser,
  users,
  posts,
  reels,
  communities,
  onUpdateOwnProfile,
  onToggleFollow,
  onToggleBlock,
  onSubmitReport,
  onOpenCommunity,
  onSelectProfileUser,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'communities'>('posts');
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profileUser.displayName);
  const [bio, setBio] = useState(profileUser.bio);
  const [statusText, setStatusText] = useState(profileUser.statusText || '');
  const [isPrivate, setIsPrivate] = useState(profileUser.isPrivate);

  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Impersonation or Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportNotice, setReportNotice] = useState('');

  const isOwnProfile = profileUser.id === currentUser.id;
  const isFollowing = currentUser.following.includes(profileUser.id);
  const isBlocked = currentUser.blockedUsers.includes(profileUser.id);

  const canViewContent =
    isOwnProfile || !profileUser.isPrivate || profileUser.followers.includes(currentUser.id);

  const authoredPosts = posts.filter((p) => p.authorId === profileUser.id);
  const savedPosts = posts.filter((p) => profileUser.savedPostIds.includes(p.id));
  const joinedCommunities = communities.filter((c) =>
    c.members.some((m) => m.userId === profileUser.id)
  );
  const authoredReels = reels.filter((r) => r.authorId === profileUser.id);

  return (
    <div className="space-y-6">
      {/* Profile Header Banner & Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#11141E]">
        <div
          className="h-32 w-full"
          style={{
            background: `linear-gradient(135deg, ${profileUser.bannerColor || '#4F46E5'} 0%, #0B0D13 100%)`,
          }}
        />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <img
                src={profileUser.avatarUrl}
                alt={profileUser.displayName}
                referrerPolicy="no-referrer"
                className="h-24 w-24 rounded-2xl border-4 border-[#11141E] bg-[#0B0D13] object-cover shadow-xl"
              />
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white">{profileUser.displayName}</h1>
                  {profileUser.isPrivate ? (
                    <Lock className="h-4 w-4 text-amber-400" aria-label="Private Profile" />
                  ) : (
                    <Globe className="h-4 w-4 text-indigo-400" aria-label="Public Profile" />
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  @{profileUser.username} · Role: {profileUser.platformRole}
                  {profileUser.statusText ? ` · ${profileUser.statusText}` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    setDisplayName(profileUser.displayName);
                    setBio(profileUser.bio);
                    setStatusText(profileUser.statusText || '');
                    setIsPrivate(profileUser.isPrivate);
                    setEditing((e) => !e);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{editing ? 'Close Editor' : 'Edit Profile'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onToggleFollow(profileUser.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                      isFollowing
                        ? 'border border-slate-700 bg-[#0B0D13] text-white'
                        : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleBlock(profileUser.id)}
                    className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-slate-300 hover:border-red-500/50 hover:text-red-300 cursor-pointer"
                  >
                    <ShieldBan className="h-3.5 w-3.5" />
                    <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    aria-label="Report User"
                    className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-slate-300 hover:text-amber-300 cursor-pointer"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    <span>Report</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm text-slate-200 leading-relaxed">{profileUser.bio}</p>

          {/* Unboxed Metadata Metrics */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-300 tabular-nums">
            <span>
              <strong className="text-white">{authoredPosts.length}</strong> posts
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="text-white">{authoredReels.length}</strong> reels
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setFollowModalType('followers')}
              className="hover:text-indigo-300 cursor-pointer"
            >
              <strong className="text-white">{profileUser.followers.length}</strong> followers
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setFollowModalType('following')}
              className="hover:text-indigo-300 cursor-pointer"
            >
              <strong className="text-white">{profileUser.following.length}</strong> following
            </button>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="text-white">{joinedCommunities.length}</strong> community servers
            </span>
          </div>

          {reportNotice && (
            <p className="mt-3 text-xs font-medium text-emerald-400">{reportNotice}</p>
          )}

          {/* Edit Own Profile Form */}
          {editing && isOwnProfile && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onUpdateOwnProfile({
                  displayName: displayName.trim(),
                  bio: bio.trim(),
                  statusText: statusText.trim(),
                  isPrivate,
                });
                setEditing(false);
              }}
              className="mt-5 rounded-xl border border-slate-800 bg-[#0B0D13] p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prof-name" className="block text-xs font-medium text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="prof-status" className="block text-xs font-medium text-slate-300 mb-1">
                    Status Activity
                  </label>
                  <input
                    id="prof-status"
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="prof-bio" className="block text-xs font-medium text-slate-300 mb-1">
                  Biography
                </label>
                <textarea
                  id="prof-bio"
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <span>Private Profile (Only approved followers can view your posts)</span>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#6366F1] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Tabs: Posts Grid, Saved Bookmarks, & Original Feature: Community Contributions */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-[#6366F1] text-white'
              : 'bg-[#11141E] text-slate-400 hover:text-white'
          }`}
        >
          <Grid className="h-3.5 w-3.5" />
          <span>Posts ({authoredPosts.length})</span>
        </button>

        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-[#6366F1] text-white'
                : 'bg-[#11141E] text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Saved Bookmarks ({savedPosts.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('communities')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
            activeTab === 'communities'
              ? 'bg-[#6366F1] text-white'
              : 'bg-[#11141E] text-slate-400 hover:text-white'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Community Memberships &amp; Roles ({joinedCommunities.length})</span>
        </button>
      </div>

      {!canViewContent ? (
        <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-12 text-center">
          <Lock className="mx-auto h-8 w-8 text-amber-400 mb-2" />
          <h3 className="text-sm font-bold text-white">This Account is Private</h3>
          <p className="mt-1 text-xs text-slate-400">
            Follow @{profileUser.username} to view their posts and studio contributions.
          </p>
        </div>
      ) : activeTab === 'communities' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {joinedCommunities.map((srv) => {
            const memberRecord = srv.members.find((m) => m.userId === profileUser.id);
            return (
              <div
                key={srv.id}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#11141E] p-5"
              >
                <div>
                  <h3 className="text-sm font-bold text-white">{srv.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Role: <span className="text-indigo-300 font-semibold">{memberRecord?.role}</span> · Joined{' '}
                    {memberRecord ? new Date(memberRecord.joinedAt).toLocaleDateString() : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCommunity(srv.id)}
                  className="rounded-xl bg-[#0B0D13] border border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-indigo-500/50 cursor-pointer"
                >
                  Open Server
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === 'posts' ? authoredPosts : savedPosts).map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-slate-800 bg-[#11141E] overflow-hidden flex flex-col justify-between"
            >
              {post.mediaUrls[0] && (
                <img
                  src={post.mediaUrls[0]}
                  alt={post.caption}
                  referrerPolicy="no-referrer"
                  className="h-48 w-full object-cover"
                />
              )}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                  {post.caption}
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 tabular-nums">
                  <span>{post.likes.length} likes</span>
                  <span>{post.comments.length} comments</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Followers / Following Modal */}
      {followModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={followModalType}
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#11141E] p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white capitalize">{followModalType}</h3>
              <button
                type="button"
                onClick={() => setFollowModalType(null)}
                aria-label="Close Followers Modal"
                className="rounded-lg p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {(followModalType === 'followers'
                ? profileUser.followers
                : profileUser.following
              ).map((uid) => {
                const usr = users.find((u) => u.id === uid);
                if (!usr) return null;
                return (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => {
                      onSelectProfileUser(usr.id);
                      setFollowModalType(null);
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0B0D13] p-2.5 text-left hover:border-indigo-500/40 cursor-pointer"
                  >
                    <img
                      src={usr.avatarUrl}
                      alt={usr.displayName}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">{usr.displayName}</p>
                      <p className="text-[11px] text-slate-400">@{usr.username}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-user-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#11141E] p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 id="report-user-title" className="text-base font-semibold text-white">
                Report @{profileUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                aria-label="Close Report Modal"
                className="rounded-lg p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onSubmitReport({
                  targetType: 'user',
                  targetId: profileUser.id,
                  reason: reportReason,
                  details: reportDetails,
                });
                setShowReportModal(false);
                setReportNotice('Report submitted to the moderation queue.');
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label htmlFor="rep-reason" className="block text-xs font-medium text-slate-300 mb-1">
                  Reason
                </label>
                <select
                  id="rep-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white"
                >
                  <option value="Impersonation or Spam">Impersonation or Spam</option>
                  <option value="Harassment or Abuse">Harassment or Abuse</option>
                  <option value="Policy Violation">Policy Violation</option>
                </select>
              </div>
              <div>
                <label htmlFor="rep-details" className="block text-xs font-medium text-slate-300 mb-1">
                  Additional Context
                </label>
                <textarea
                  id="rep-details"
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
