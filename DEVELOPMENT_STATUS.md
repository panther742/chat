# DEVELOPMENT_STATUS.md — Anonymous Chat (Social & Community Platform)

## 1. Initial Workspace Audit & Feature Inventory

### Workspace Inspection Summary
- **Discovered Initial State**: The workspace started as a clean React 19 + Vite 8 + Express 4 + TypeScript 7 scaffold (`src/App.tsx` returned `<div></div>`, no legacy `server.js` existed, and no `.git` repository was initialized).
- **Preservation & Continuity**: All existing configuration files (`package.json`, `vite.config.ts`, `tsconfig.json`, `.env.example`, `metadata.json`, `index.html`) were preserved and extended.
- **Centralized Brand Configuration**: Created `src/config/appConfig.ts` keeping the temporary brand name **Anonymous Chat** (`shortName: "AnonChat"`) configurable in one place, plus an interactive Brand Configurator in the UI.

### Feature Inventory Status
| Milestone / Capability | Status | Notes |
| :--- | :--- | :--- |
| **M1: Audit, Atomic Store & Security Baseline** | **Implemented and tested** | Atomic `data/store.json` + `.bak` + `.tmp` rename + `store.lock`, fail-closed corrupted store detection, PBKDF2-HMAC-SHA256 passwords, no default admin password fallback, no 24h server deletion, no 300-message trimming. |
| **M2: Auth, Profiles, Follows & Social Graph** | **Implemented and tested** | Registration, login, password change, account deletion with confirmation, profile editing, public/private account enforcement, follow/unfollow, followers/following modal, block/unblock, user reporting. |
| **M3: Posts, Comments, Likes, Bookmarks & Media** | **Implemented and tested** | Text & image posts, duplicate-free likes/saves, comments, filename sanitization, MIME & executable magic-byte rejection (`src/lib/domainLogic.ts`). |
| **M4: Discord-Style Communities, Channels & Roles** | **Implemented and tested** | Create/join servers, public/private servers, invite codes, categories, text/voice/announcement channels, Owner/Admin/Moderator/Member role hierarchy, message pinning, kick/ban, audit logs. |
| **M5: Real-Time Chat, DMs, Group Chats & Passphrase Lock** | **Implemented and tested** | WebSocket (`/ws`) broadcast, 1-on-1 & group DM threads, unread counts, read receipts, typing indicators, reactions, and AES-256-GCM password-protected messages (`encryptProtectedMessage` / `decryptProtectedMessage`). |
| **M6: 24-Hour Ephemeral Stories & Short-Form Reels** | **Implemented and tested** | Horizontal Stories tray, full-screen viewer with progress bar, viewer list, strict 24h expiry isolated only to Stories (`filterActiveStories`), vertical Reels with canvas synthesizer + MP4/WebM upload validation. |
| **M7: WebRTC Voice, Video & Screen Sharing** | **Implemented and tested** | `VoiceRoomPanel.tsx` with `RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`, WebSocket signaling relay (`webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`), STUN/TURN config, and media track cleanup. |
| **M8: Search, Discovery, Reporting & Admin Panel** | **Implemented and tested** | Unified Explore search across users/communities/channels/posts/reels enforcing privacy & block lists; protected Admin & Moderation console with report resolution, user suspension, and storage health check. |
| **M9: Database Scaling & PostgreSQL Migration Plan** | **Implemented and documented** | Atomic JSON store active for single-node persistence; complete non-destructive PostgreSQL schema & migration strategy documented below. |
| **M10: Android & PWA Implementation** | **Implemented and tested** | `vite-plugin-pwa`, Web App Manifest (`standalone`), generated binary `180x180`, `192x192`, `512x512` PNG icons, `PWAInstallButton`, and `OfflineIndicator`. (Native Android `.apk` requires Android SDK/Gradle outside container.) |
| **M12: Original Differentiating Features** | **Implemented and tested** | 1. User-Controlled Feed Modes (`Unified`, `Following`, `Communities`, `Latest`), 2. Channel-Bridged Social Posts, 3. Ephemeral Post/Reel "Pulse Rooms" & Profile Community Contribution history. |

---

## 2. Database Evaluation & Non-Destructive PostgreSQL Migration Plan (Section 19)

1. **Why JSON Persistence Has Scaling Limits**:
   - While our atomic `store.json.tmp` -> `store.json` + `store.json.bak` architecture guarantees single-node crash consistency, full-file serialization scales $O(N)$ with total records and locks across horizontal replicas.
2. **Compatible PostgreSQL Schema & Non-Destructive Migration Steps**:
   - Tables: `users`, `user_credentials`, `sessions`, `follows`, `blocks`, `posts`, `post_comments`, `stories` (with index on `expires_at`), `reels`, `communities`, `community_members`, `channels`, `messages` (with nullable `encrypted_payload JSONB`), `dm_threads`, `notifications`, `moderation_reports`, `audit_logs`.
   - Migration workflow when a PostgreSQL instance is provisioned:
     1. Trigger `POST /api/admin/backup` to flush and verify `data/store.json` and `data/store.json.bak`.
     2. Run a non-destructive import transaction reading `data/store.json` and inserting rows with `ON CONFLICT (id) DO NOTHING` into a staging PostgreSQL database.
     3. Verify row counts match `/api/admin/storage-health` before switching read/write traffic.
