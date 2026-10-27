import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Film,
  Heart,
  MessageCircle,
  Music,
  Pause,
  Play,
  Plus,
  Share2,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { CommunityServer, ReelItem, UserProfile } from '../types/platform';

interface ReelsViewProps {
  reels: ReelItem[];
  currentUser: UserProfile;
  users: UserProfile[];
  communities: CommunityServer[];
  onLikeReel: (reelId: string) => Promise<void>;
  onSaveReel: (reelId: string) => Promise<void>;
  onCommentReel: (reelId: string, content: string) => Promise<void>;
  onCreateReel: (payload: {
    caption: string;
    visualPreset: ReelItem['visualPreset'];
    audioTrackTitle: string;
    durationSec: number;
    videoUrl?: string;
    linkedCommunityId?: string;
  }) => Promise<void>;
  onDeleteReel: (reelId: string) => Promise<void>;
  onNavigateToCommunity: (communityId: string) => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  reels,
  currentUser,
  users,
  communities,
  onLikeReel,
  onSaveReel,
  onCommentReel,
  onCreateReel,
  onDeleteReel,
  onNavigateToCommunity,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  // Upload form state
  const [newCaption, setNewCaption] = useState('');
  const [newPreset, setNewPreset] = useState<ReelItem['visualPreset']>('synth_waves');
  const [newAudioTrack, setNewAudioTrack] = useState('');
  const [newLinkedCommunityId, setNewLinkedCommunityId] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [uploadError, setUploadError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeReel = reels[activeIndex] || reels[0];

  // Deterministic, low-CPU procedural canvas frame renderer for Reels
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeReel) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const drawFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#090B11';
      ctx.fillRect(0, 0, w, h);

      // Subtle atmospheric gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      if (activeReel.visualPreset === 'cyber_grid') {
        grad.addColorStop(0, '#0F172A');
        grad.addColorStop(0.5, '#1E1B4B');
        grad.addColorStop(1, '#090D16');
      } else if (activeReel.visualPreset === 'aurora_pulse') {
        grad.addColorStop(0, '#090D16');
        grad.addColorStop(0.5, '#3B0764');
        grad.addColorStop(1, '#0F172A');
      } else {
        grad.addColorStop(0, '#0B0D13');
        grad.addColorStop(0.6, '#1E1B4B');
        grad.addColorStop(1, '#111827');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw harmonic waves / spatial geometry
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 2.5;
      for (let layer = 0; layer < 4; layer++) {
        ctx.beginPath();
        const yBase = h * 0.35 + layer * 48;
        for (let x = 0; x <= w; x += 12) {
          const wave =
            Math.sin((x * 0.018) + (frame * 0.08) + layer) * (24 + layer * 6) +
            Math.cos((x * 0.009) - (frame * 0.05)) * 14;
          const y = yBase + wave;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = layer % 2 === 0 ? 'rgba(99, 102, 241, 0.65)' : 'rgba(168, 85, 247, 0.5)';
        ctx.stroke();
      }

      // Center studio frequency ring
      ctx.beginPath();
      const pulseRadius = 68 + Math.sin(frame * 0.1) * 10;
      ctx.arc(w / 2, h * 0.42, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
    };

    drawFrame();
    if (!isPlaying) return;

    // Throttled 12fps interval so software headless Chromium never stalls
    const timer = window.setInterval(() => {
      frame += 1;
      drawFrame();
    }, 85);

    return () => window.clearInterval(timer);
  }, [activeReel, isPlaying]);

  if (!activeReel) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#11141E] p-12 text-center">
        <Film className="h-10 w-10 text-indigo-400 mb-3" />
        <h2 className="text-lg font-semibold text-white">No Reels Published Yet</h2>
        <p className="mt-1 text-sm text-slate-400">
          Upload a short vertical studio reel or audio-reactive clip to start the feed.
        </p>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="mt-4 rounded-lg bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
        >
          Upload First Reel
        </button>
      </div>
    );
  }

  const author = users.find((u) => u.id === activeReel.authorId);
  const isLiked = activeReel.likes.includes(currentUser.id);
  const isSaved = currentUser.savedReelIds.includes(activeReel.id);
  const linkedCommunity = communities.find((c) => c.id === activeReel.linkedCommunityId);

  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(`Unsupported format (${file.type || 'unknown'}). Supported: MP4, WebM, Ogg.`);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Video exceeds 25 MB upload limit.');
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    setNewPreset('uploaded_video');
  };

  const handleCreateReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim()) {
      setUploadError('Please provide a caption for your Reel.');
      return;
    }
    await onCreateReel({
      caption: newCaption.trim(),
      visualPreset: newPreset,
      audioTrackTitle: newAudioTrack.trim() || `${currentUser.displayName} — Studio Session`,
      durationSec: 25,
      videoUrl: uploadedVideoUrl || undefined,
      linkedCommunityId: newLinkedCommunityId || undefined,
    });
    setNewCaption('');
    setNewAudioTrack('');
    setUploadedVideoUrl('');
    setShowUploadModal(false);
    setActiveIndex(0);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Reels &amp; Short Studio Clips</h1>
          <p className="text-xs text-slate-400">
            Vertical short-form video feed with community channel links and format validation (MP4/WebM)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Reel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Vertical Video Player Column */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative h-[640px] w-full max-w-[380px] overflow-hidden rounded-2xl border border-slate-800 bg-[#090B11] shadow-2xl">
            {activeReel.videoUrl ? (
              <video
                src={activeReel.videoUrl}
                className="h-full w-full object-cover"
                loop
                muted={isMuted}
                autoPlay={isPlaying}
                playsInline
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={380}
                height={640}
                className="h-full w-full object-cover"
              />
            )}

            {/* Top Player Controls */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="tabular-nums">
                  Reel {activeIndex + 1} / {reels.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{activeReel.durationSec}s</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? 'Pause Reel' : 'Play Reel'}
                  className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 cursor-pointer"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  aria-label={isMuted ? 'Unmute Reel Audio' : 'Mute Reel Audio'}
                  className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 cursor-pointer"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Right Action Rail */}
            <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => onLikeReel(activeReel.id)}
                aria-label={`Like Reel (${activeReel.likes.length})`}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <div
                  className={`rounded-full p-3 transition ${
                    isLiked
                      ? 'bg-rose-500 text-white'
                      : 'bg-black/60 text-slate-200 hover:bg-black/80'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                </div>
                <span className="text-xs font-semibold text-white tabular-nums">
                  {activeReel.likes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowComments((c) => !c)}
                aria-label={`Reel Comments (${activeReel.comments.length})`}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <div className="rounded-full bg-black/60 p-3 text-slate-200 hover:bg-black/80">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-white tabular-nums">
                  {activeReel.comments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSaveReel(activeReel.id)}
                aria-label={isSaved ? 'Remove Reel Bookmark' : 'Bookmark Reel'}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <div
                  className={`rounded-full p-3 transition ${
                    isSaved
                      ? 'bg-indigo-500 text-white'
                      : 'bg-black/60 text-slate-200 hover:bg-black/80'
                  }`}
                >
                  <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                </div>
                <span className="text-xs font-semibold text-white">
                  {isSaved ? 'Saved' : 'Save'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareFeedback('Reel link copied to clipboard');
                  setTimeout(() => setShareFeedback(''), 2500);
                }}
                aria-label="Share Reel"
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <div className="rounded-full bg-black/60 p-3 text-slate-200 hover:bg-black/80">
                  <Share2 className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-white">Share</span>
              </button>

              {(activeReel.authorId === currentUser.id || currentUser.platformRole === 'admin') && (
                <button
                  type="button"
                  onClick={() => onDeleteReel(activeReel.id)}
                  aria-label="Delete Reel"
                  className="rounded-full bg-red-950/80 p-2.5 text-red-300 hover:bg-red-900 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Bottom Measured Contrast Scrim & Creator Info */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-5 pt-16">
              <div className="flex items-center gap-2.5">
                <img
                  src={author?.avatarUrl}
                  alt={author?.displayName || 'Creator'}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full border border-indigo-500/40 object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {author?.displayName || 'Creator'}
                  </p>
                  <p className="text-xs text-slate-300">@{author?.username}</p>
                </div>
              </div>

              <p className="mt-2.5 text-sm text-slate-100 leading-snug pr-12">
                {activeReel.caption}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <Music className="h-3.5 w-3.5" />
                  <span>{activeReel.audioTrackTitle}</span>
                </span>
                {linkedCommunity && (
                  <button
                    type="button"
                    onClick={() => onNavigateToCommunity(linkedCommunity.id)}
                    className="underline decoration-indigo-400/60 underline-offset-4 text-indigo-300 hover:text-white cursor-pointer"
                  >
                    Community: {linkedCommunity.name}
                  </button>
                )}
              </div>

              {shareFeedback && (
                <p className="mt-2 text-xs font-medium text-emerald-400">{shareFeedback}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Navigation & Comments Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Navigate Reels Queue</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  aria-label="Previous Reel"
                  className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B0D13] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-500/50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={activeIndex >= reels.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(reels.length - 1, i + 1))}
                  aria-label="Next Reel"
                  className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B0D13] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-500/50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>Next</span>
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {reels.map((r, idx) => {
                const rAuthor = users.find((u) => u.id === r.authorId);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                      idx === activeIndex
                        ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                        : 'border-slate-800/80 bg-[#0B0D13] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-semibold truncate">{r.caption}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        @{rAuthor?.username} · {r.durationSec}s
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums shrink-0">
                      {r.likes.length} likes
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reel Comments Box */}
          <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-5">
            <h3 className="text-sm font-semibold text-white">
              Reel Discussion ({activeReel.comments.length})
            </h3>
            <div className="mt-3 max-h-60 space-y-2.5 overflow-y-auto pr-1">
              {activeReel.comments.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">
                  No comments on this Reel yet. Start the conversation below.
                </p>
              ) : (
                activeReel.comments.map((c) => {
                  const cAuthor = users.find((u) => u.id === c.authorId);
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-800/80 bg-[#0B0D13] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-slate-200">
                          {cAuthor?.displayName || c.authorId}
                        </span>
                        <span className="tabular-nums">
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-300">{c.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!commentInput.trim()) return;
                await onCommentReel(activeReel.id, commentInput.trim());
                setCommentInput('');
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                aria-label="Add a comment to this Reel"
                placeholder="Add a comment on this Reel..."
                className="flex-1 rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Upload Reel Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-reel-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#11141E] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 id="upload-reel-title" className="text-base font-semibold text-white">
                Upload Short-Form Reel
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                aria-label="Close Upload Reel Modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReelSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Synthesizer Visualizer Preset or Video File (MP4/WebM ≤ 25MB)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'synth_waves', label: 'Synth Waves' },
                      { id: 'cyber_grid', label: 'Spatial Grid' },
                      { id: 'aurora_pulse', label: 'Aurora Pulse' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNewPreset(item.id)}
                      className={`rounded-xl border p-2 text-xs font-medium transition cursor-pointer ${
                        newPreset === item.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-white'
                          : 'border-slate-800 bg-[#0B0D13] text-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <label className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-[#0B0D13] px-3 py-2.5 text-xs font-medium text-slate-300 hover:border-indigo-500/60 cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-indigo-400" />
                  <span>
                    {uploadedVideoUrl
                      ? 'Video File Validated & Ready'
                      : 'Or Select Local Video File (.mp4 / .webm)'}
                  </span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={handleVideoFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label htmlFor="reel-caption" className="block text-xs font-medium text-slate-300 mb-1">
                  Reel Caption
                </label>
                <textarea
                  id="reel-caption"
                  rows={2}
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Describe your clip, patch notes, or studio process..."
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reel-audio" className="block text-xs font-medium text-slate-300 mb-1">
                    Audio Track Title
                  </label>
                  <input
                    id="reel-audio"
                    type="text"
                    value={newAudioTrack}
                    onChange={(e) => setNewAudioTrack(e.target.value)}
                    placeholder="Original Studio Audio"
                    className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="reel-comm" className="block text-xs font-medium text-slate-300 mb-1">
                    Cross-Link Community
                  </label>
                  <select
                    id="reel-comm"
                    value={newLinkedCommunityId}
                    onChange={(e) => setNewLinkedCommunityId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">None</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {uploadError && (
                <p role="alert" className="text-xs font-medium text-red-400">
                  {uploadError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                >
                  Publish Reel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
