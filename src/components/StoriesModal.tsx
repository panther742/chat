import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Pause,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { StoryItem, UserProfile } from '../types/platform';
import { STORY_MEDIA_ASSETS } from '../utils/visualAssets';

interface StoriesViewerProps {
  stories: StoryItem[];
  initialIndex: number;
  currentUser: UserProfile;
  users: UserProfile[];
  onClose: () => void;
  onDeleteStory: (storyId: string) => Promise<void>;
  onMarkViewed: (storyId: string) => void;
}

export const StoriesViewerModal: React.FC<StoriesViewerProps> = ({
  stories,
  initialIndex,
  currentUser,
  users,
  onClose,
  onDeleteStory,
  onMarkViewed,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, stories.length - 1))
  );
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);

  const activeStory = stories[currentIndex];

  useEffect(() => {
    if (!activeStory) {
      onClose();
      return;
    }
    onMarkViewed(activeStory.id);
    setProgress(0);
  }, [currentIndex, activeStory?.id]);

  useEffect(() => {
    if (paused || !activeStory) return;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((i) => i + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return prev + 2.5;
      });
    }, 150);
    return () => window.clearInterval(interval);
  }, [paused, currentIndex, stories.length, activeStory, onClose]);

  if (!activeStory) return null;

  const author = users.find((u) => u.id === activeStory.authorId);
  const hoursRemaining = Math.max(
    1,
    Math.ceil((new Date(activeStory.expiresAt).getTime() - Date.now()) / (1000 * 3600))
  );
  const isOwner = activeStory.authorId === currentUser.id || currentUser.platformRole === 'admin';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="24-Hour Story Viewer"
    >
      <div className="relative flex h-[84vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0B0D13] shadow-2xl">
        {/* Progress Bars */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1.5">
          {stories.map((st, idx) => (
            <div key={st.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-indigo-400 transition-all duration-150"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="relative z-20 mt-6 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2.5">
            <img
              src={author?.avatarUrl}
              alt={author?.displayName || 'Creator'}
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full border border-indigo-500/50 object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {author?.displayName || 'Creator'}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-slate-300 tabular-nums">
                <Clock className="h-3 w-3 text-indigo-400" />
                <span>Expires in {hoursRemaining}h (24h Story window)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Resume Story' : 'Pause Story'}
              className="rounded-lg bg-black/50 p-2 text-slate-200 hover:bg-black/80 cursor-pointer"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={async () => {
                  await onDeleteStory(activeStory.id);
                  if (stories.length <= 1) onClose();
                }}
                aria-label="Delete own Story"
                className="rounded-lg bg-red-950/70 p-2 text-red-300 hover:bg-red-900/80 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Story Viewer"
              className="rounded-lg bg-black/50 p-2 text-slate-200 hover:bg-black/80 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Story Media Canvas */}
        <div className="relative flex-1 flex items-center justify-center bg-[#090B10] overflow-hidden">
          <img
            src={activeStory.mediaUrl}
            alt={activeStory.caption}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-5 pt-12">
            <p className="text-sm font-medium text-white leading-relaxed">
              {activeStory.caption}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
              <button
                type="button"
                onClick={() => setShowViewers((v) => !v)}
                className="flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="tabular-nums">{activeStory.viewerIds.length} viewers</span>
              </button>
              <span className="text-slate-400">24h Ephemeral Story</span>
            </div>

            {showViewers && (
              <div className="mt-3 rounded-xl border border-slate-800 bg-[#11141E]/95 p-3 text-xs text-slate-300">
                <p className="font-semibold text-white mb-1.5">Viewed by:</p>
                <div className="flex flex-wrap gap-2">
                  {activeStory.viewerIds.map((vid) => {
                    const u = users.find((usr) => usr.id === vid);
                    return (
                      <span key={vid} className="text-slate-300">
                        @{u?.username || vid}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Prev / Next Navigation Controls */}
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              aria-label="Previous Story"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {currentIndex < stories.length - 1 && (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(stories.length - 1, i + 1))}
              aria-label="Next Story"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface CreateStoryModalProps {
  onClose: () => void;
  onCreateStory: (payload: { caption: string; mediaUrl: string }) => Promise<void>;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ onClose, onCreateStory }) => {
  const [caption, setCaption] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<'tokyo' | 'shader' | 'custom'>('tokyo');
  const [customDataUrl, setCustomDataUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Story image must be under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomDataUrl(reader.result);
        setSelectedPreset('custom');
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      setError('Please enter a caption for your 24-hour Story.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const mediaUrl =
        selectedPreset === 'custom' && customDataUrl
          ? customDataUrl
          : selectedPreset === 'shader'
          ? STORY_MEDIA_ASSETS.shaderPrototype
          : STORY_MEDIA_ASSETS.tokyoRain;
      await onCreateStory({ caption: caption.trim(), mediaUrl });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish Story.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-story-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#11141E] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 id="create-story-title" className="text-base font-semibold text-white">
            Publish 24-Hour Story
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Create Story Modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Visual Backdrop or Upload Image
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedPreset('tokyo')}
                className={`rounded-xl border p-2.5 text-left text-xs transition cursor-pointer ${
                  selectedPreset === 'tokyo'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white'
                    : 'border-slate-800 bg-[#0B0D13] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">Shibuya Blue Hour</div>
                <div className="text-[11px] text-slate-400 mt-0.5">35mm Night Frame</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPreset('shader')}
                className={`rounded-xl border p-2.5 text-left text-xs transition cursor-pointer ${
                  selectedPreset === 'shader'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white'
                    : 'border-slate-800 bg-[#0B0D13] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">WebRTC Synth Stage</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Audio Visual Canvas</div>
              </button>
            </div>

            <label className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-[#0B0D13] px-3 py-2.5 text-xs font-medium text-slate-300 hover:border-indigo-500/60 cursor-pointer">
              <Upload className="h-3.5 w-3.5 text-indigo-400" />
              <span>{customDataUrl ? 'Custom Image Loaded' : 'Or Upload Custom Image (PNG/JPG/WebP)'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label htmlFor="story-caption-input" className="block text-xs font-medium text-slate-300 mb-1.5">
              Story Caption
            </label>
            <textarea
              id="story-caption-input"
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share what you're building in the studio (auto-expires after 24 hours)..."
              className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <p className="text-xs text-slate-400">
            Note: The 24-hour expiry applies strictly to Stories and never deletes servers, channels, or regular posts.
          </p>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{submitting ? 'Publishing...' : 'Publish Story'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
