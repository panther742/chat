import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Radio,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import type { CommunityChannel, UserProfile } from '../types/platform';

interface VoiceRoomPanelProps {
  channel: CommunityChannel;
  currentUser: UserProfile;
  users: UserProfile[];
  activeParticipantIds: string[];
  iceServers: RTCIceServer[];
  onSendWsEvent: (event: Record<string, unknown>) => void;
  onLeaveVoice: () => void;
}

export const VoiceRoomPanel: React.FC<VoiceRoomPanelProps> = ({
  channel,
  currentUser,
  users,
  activeParticipantIds,
  iceServers,
  onSendWsEvent,
  onLeaveVoice,
}) => {
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'connected-signaling' | 'local-media-active' | 'permission-fallback'
  >('connected-signaling');
  const [deviceDiagnostic, setDeviceDiagnostic] = useState<string>(
    'WebRTC Signaling Ready · STUN/ICE Configured'
  );

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);

  const cleanupMediaTracks = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
  };

  useEffect(() => {
    onSendWsEvent({ type: 'voice:join', channelId: channel.id });

    // Initialize RTCPeerConnection with configured STUN/TURN servers
    try {
      const pc = new RTCPeerConnection({ iceServers });
      pc.onicecandidate = (evt) => {
        if (evt.candidate) {
          onSendWsEvent({
            type: 'webrtc:ice-candidate',
            payload: { channelId: channel.id, candidate: evt.candidate },
          });
        }
      };
      peerConnRef.current = pc;
    } catch {
      setDeviceDiagnostic('RTCPeerConnection unavailable in this browser context.');
    }

    return () => {
      onSendWsEvent({ type: 'voice:leave', channelId: channel.id });
      cleanupMediaTracks();
    };
  }, [channel.id]);

  const toggleCamera = async () => {
    if (camEnabled) {
      cleanupMediaTracks();
      setCamEnabled(false);
      setConnectionState('connected-signaling');
      setDeviceDiagnostic('Camera track stopped cleanly.');
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not exposed in this browser context.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360 },
        audio: micEnabled,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      if (peerConnRef.current) {
        stream.getTracks().forEach((track) => peerConnRef.current?.addTrack(track, stream));
        const offer = await peerConnRef.current.createOffer();
        await peerConnRef.current.setLocalDescription(offer);
        onSendWsEvent({
          type: 'webrtc:offer',
          payload: { channelId: channel.id, sdp: offer },
        });
      }
      setCamEnabled(true);
      setConnectionState('local-media-active');
      setDeviceDiagnostic('Hardware camera & microphone stream active via WebRTC.');
    } catch (err) {
      setConnectionState('permission-fallback');
      setDeviceDiagnostic(
        `Camera hardware/permission unavailable (${
          err instanceof Error ? err.message : 'No device'
        }). Signaling remains connected in audio-only/listener mode.`
      );
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      cleanupMediaTracks();
      setScreenSharing(false);
      setDeviceDiagnostic('Screen share session ended and tracks released.');
      return;
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('getDisplayMedia not supported on this device.');
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setScreenSharing(true);
      setConnectionState('local-media-active');
      setDeviceDiagnostic('Screen sharing stream active.');
    } catch (err) {
      setDeviceDiagnostic(
        `Screen share cancelled or unsupported (${
          err instanceof Error ? err.message : 'Not allowed'
        }).`
      );
    }
  };

  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
    }
  };

  const participantIds = Array.from(new Set([currentUser.id, ...activeParticipantIds]));

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-[#0D1018] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">{channel.name}</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{channel.topic}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Authenticated Signaling · No Unconsented Recording</span>
        </div>
      </div>

      {/* Stage Grid */}
      <div className="my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {participantIds.map((uid) => {
          const user = users.find((u) => u.id === uid) || currentUser;
          const isMe = uid === currentUser.id;
          return (
            <div
              key={uid}
              className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-[#131722] p-6 min-h-[210px]"
            >
              {isMe && (camEnabled || screenSharing) ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 rounded-full border-2 border-indigo-500/50 object-cover"
                />
              )}

              <div className="relative z-10 mt-3 text-center bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
                <p className="text-sm font-semibold text-white">
                  {user.displayName} {isMe ? '(You)' : ''}
                </p>
                <p className="text-xs text-slate-300">
                  {isMe
                    ? micEnabled
                      ? 'Mic Unmuted'
                      : 'Muted'
                    : 'Connected via WebRTC Signaling'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostic & Controls Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#11141E] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Radio className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>{deviceDiagnostic}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={toggleMic}
            aria-label={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
              micEnabled
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-amber-600/20 border border-amber-500/40 text-amber-300'
            }`}
          >
            {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            <span>{micEnabled ? 'Mute Mic' : 'Unmute Mic'}</span>
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            aria-label={camEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
              camEnabled
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {camEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
            <span>{camEnabled ? 'Camera On' : 'Camera Off'}</span>
          </button>

          <button
            type="button"
            onClick={toggleScreenShare}
            aria-label={screenSharing ? 'Stop Screen Share' : 'Share Screen'}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
              screenSharing
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <MonitorUp className="h-4 w-4" />
            <span>{screenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cleanupMediaTracks();
              onLeaveVoice();
            }}
            aria-label="Disconnect from Voice Room"
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-500 transition cursor-pointer"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
};
