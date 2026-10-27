import React, { useState } from 'react';
import {
  KeyRound,
  LogIn,
  Sliders,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { BrandConfig } from '../config/appConfig';
import type { UserProfile } from '../types/platform';

interface AuthAndSettingsModalProps {
  brandConfig: BrandConfig;
  onUpdateBrandConfig: (patch: Partial<BrandConfig>) => void;
  currentUser: UserProfile;
  users: UserProfile[];
  onSwitchActiveUser: (userId: string) => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (payload: {
    username: string;
    displayName: string;
    password: string;
    bio: string;
  }) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onDeleteAccount: (confirmUsername: string) => Promise<void>;
  onClose: () => void;
}

export const AuthAndSettingsModal: React.FC<AuthAndSettingsModalProps> = ({
  brandConfig,
  onUpdateBrandConfig,
  currentUser,
  users,
  onSwitchActiveUser,
  onLogin,
  onRegister,
  onChangePassword,
  onDeleteAccount,
  onClose,
}) => {
  const [tab, setTab] = useState<'brand' | 'auth' | 'security'>('brand');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');

  // Brand config state
  const [appName, setAppName] = useState(brandConfig.appName);
  const [shortName, setShortName] = useState(brandConfig.shortName);
  const [tagline, setTagline] = useState(brandConfig.tagline);
  const [savedNotice, setSavedNotice] = useState('');

  // Login / Register state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [authError, setAuthError] = useState('');

  // Security state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [secFeedback, setSecFeedback] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#11141E] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 id="settings-modal-title" className="text-base font-bold text-white">
            Platform Settings, Brand Configurator &amp; Account Security
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings Modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setTab('brand')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              tab === 'brand'
                ? 'bg-[#6366F1] text-white'
                : 'bg-[#0B0D13] text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Centralized Brand Name</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('auth')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              tab === 'auth'
                ? 'bg-[#6366F1] text-white'
                : 'bg-[#0B0D13] text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Accounts &amp; Auth</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('security')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              tab === 'security'
                ? 'bg-[#6366F1] text-white'
                : 'bg-[#0B0D13] text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Password &amp; Deletion</span>
          </button>
        </div>

        {tab === 'brand' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateBrandConfig({
                appName: appName.trim() || 'Anonymous Chat',
                shortName: shortName.trim().slice(0, 12) || 'AnonChat',
                tagline: tagline.trim(),
              });
              setSavedNotice('Centralized brand identity updated across all views.');
              setTimeout(() => setSavedNotice(''), 3000);
            }}
            className="mt-4 space-y-4"
          >
            <p className="text-xs text-slate-300 leading-relaxed">
              The temporary project name defaults to <strong>Anonymous Chat</strong> and is stored in a single centralized configuration (`src/config/appConfig.ts`). Change it here at any time to rebrand the entire platform immediately.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="brand-name-input" className="block text-xs font-medium text-slate-300 mb-1">
                  Platform Brand Name
                </label>
                <input
                  id="brand-name-input"
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="short-name-input" className="block text-xs font-medium text-slate-300 mb-1">
                  PWA Short Name (≤ 12 chars)
                </label>
                <input
                  id="short-name-input"
                  type="text"
                  maxLength={12}
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tagline-input" className="block text-xs font-medium text-slate-300 mb-1">
                Platform Tagline
              </label>
              <input
                id="tagline-input"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {savedNotice && <p className="text-xs font-medium text-emerald-400">{savedNotice}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="rounded-xl bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
              >
                Save Brand Identity
              </button>
            </div>
          </form>
        )}

        {tab === 'auth' && (
          <div className="mt-4 space-y-5">
            {/* Multi-User Role Testing Switcher */}
            <div className="rounded-xl border border-slate-800 bg-[#0B0D13] p-4">
              <p className="text-xs font-semibold text-white mb-2">
                Active Session Persona (Instant Multi-User Testing):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSwitchActiveUser(u.id)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition cursor-pointer ${
                      u.id === currentUser.id
                        ? 'border-indigo-500 bg-indigo-500/15 text-white'
                        : 'border-slate-800 bg-[#11141E] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold truncate">{u.displayName}</p>
                      <p className="text-[11px] text-slate-400">
                        @{u.username} · {u.platformRole}
                      </p>
                    </div>
                    {u.id === currentUser.id && (
                      <span className="text-[11px] font-semibold text-indigo-300">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Real Registration / Login Form */}
            <div className="rounded-xl border border-slate-800 bg-[#0B0D13] p-4">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-[#6366F1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register New Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-[#6366F1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In with Password</span>
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError('');
                  try {
                    if (authMode === 'register') {
                      await onRegister({
                        username: username.trim(),
                        displayName: displayName.trim() || username.trim(),
                        password,
                        bio: bio.trim(),
                      });
                    } else {
                      await onLogin(username.trim(), password);
                    }
                    onClose();
                  } catch (err) {
                    setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
                  }
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-username" className="block text-xs font-medium text-slate-300 mb-1">
                      Username
                    </label>
                    <input
                      id="auth-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. aria_synth"
                      className="w-full rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300 mb-1">
                      Password (PBKDF2-SHA256)
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters..."
                      className="w-full rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="auth-display" className="block text-xs font-medium text-slate-300 mb-1">
                        Display Name
                      </label>
                      <input
                        id="auth-display"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Aria Synth"
                        className="w-full rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-bio" className="block text-xs font-medium text-slate-300 mb-1">
                        Bio
                      </label>
                      <input
                        id="auth-bio"
                        type="text"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Sound designer & creator"
                        className="w-full rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {authError && <p className="text-xs text-red-400">{authError}</p>}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
                  >
                    {authMode === 'register' ? 'Create Account & Sign In' : 'Sign In'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="mt-4 space-y-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSecFeedback('');
                try {
                  await onChangePassword(currentPwd, newPwd);
                  setCurrentPwd('');
                  setNewPwd('');
                  setSecFeedback('Password updated with PBKDF2-HMAC-SHA256.');
                } catch (err) {
                  setSecFeedback(err instanceof Error ? err.message : 'Failed to change password.');
                }
              }}
              className="rounded-xl border border-slate-800 bg-[#0B0D13] p-4 space-y-3"
            >
              <h3 className="text-xs font-semibold text-white">Change Account Password</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Current password (optional in preview)"
                  aria-label="Current Password"
                  className="rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                />
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  aria-label="New Password"
                  className="rounded-xl border border-slate-800 bg-[#11141E] px-3 py-2 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#6366F1] px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                Update Password
              </button>
            </form>

            <div className="rounded-xl border border-red-900/40 bg-red-950/15 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                <Trash2 className="h-4 w-4" />
                <span>Delete Account (@{currentUser.username})</span>
              </div>
              <p className="text-xs text-slate-400">
                Deleting your account removes your credentials, active sessions, and authored posts/stories/reels. Type your exact username to confirm.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={`Type ${currentUser.username} to confirm`}
                  aria-label="Confirm username for account deletion"
                  className="rounded-xl border border-slate-800 bg-[#0B0D13] px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await onDeleteAccount(deleteConfirmName.trim());
                      onClose();
                    } catch (err) {
                      setSecFeedback(
                        err instanceof Error ? err.message : 'Account deletion failed.'
                      );
                    }
                  }}
                  className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>

            {secFeedback && <p className="text-xs text-indigo-300">{secFeedback}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
