import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { SignalingClient } from '../websocket/signaling';
import { WebRTCConnection } from '../webrtc/peerConnection';
import { ClientStreamAnalyzer, DemoScenario } from '../security/streamAnalyzer';
import {
  CallResponse,
  ChallengeResponse,
  ChallengeVerificationResponse,
  SecurityTelemetryResponse,
  ThreatSeverity,
} from '../types/call';
import { ThreatShield } from '../components/security/ThreatShield';
import { AcousticMeters } from '../components/security/AcousticMeters';
import { DemoBanner } from '../components/security/DemoBanner';
import {
  AlertTriangle,
  Clock,
  HelpCircle,
  KeyRound,
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  Volume2,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  time: string;
  message: string;
  severity: ThreatSeverity;
}

export const CallScreen: React.FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [call, setCall] = useState<CallResponse | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [webrtcState, setWebrtcState] = useState<string>('initializing');
  const [peerConnected, setPeerConnected] = useState(false);

  // Security Telemetry State
  const [threatScore, setThreatScore] = useState<number>(6.0);
  const [severity, setSeverity] = useState<ThreatSeverity>('LOW');
  const [aiProbability, setAiProbability] = useState<number>(0.04);
  const [speakerMatch, setSpeakerMatch] = useState<number | null>(0.93);
  const [liveness, setLiveness] = useState<number | null>(0.96);
  const [engineType, setEngineType] = useState<string>('LOCAL_DSP_ANALYZER');
  const [demoScenario, setDemoScenario] = useState<DemoScenario>('live');

  // Timeline & Challenge
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeResponse | null>(null);
  const [spokenResponse, setSpokenResponse] = useState('');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [verifyingChallenge, setVerifyingChallenge] = useState(false);
  const [challengeResult, setChallengeResult] = useState<ChallengeVerificationResponse | null>(null);

  // References
  const signalingRef = useRef<SignalingClient | null>(null);
  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const analyzerRef = useRef<ClientStreamAnalyzer | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Add event to timeline
  const logEvent = (message: string, eventSeverity: ThreatSeverity = 'LOW') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTimeline((prev) => [
      {
        id: `tl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: timeStr,
        message,
        severity: eventSeverity,
      },
      ...prev.slice(0, 29), // keep last 30 events
    ]);
  };

  // Call duration ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Setup WebRTC and WebSocket Signaling
  useEffect(() => {
    if (!callId) return;

    let isMounted = true;

    const setupSession = async () => {
      try {
        // Fetch call details
        const callData = await api.get<CallResponse>(`/calls/${callId}`);
        if (!isMounted) return;
        setCall(callData);

        logEvent('Call session initialized', 'LOW');

        // 1. Initialize WebRTC
        const rtc = new WebRTCConnection({
          onRemoteStream: (stream) => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = stream;
              remoteAudioRef.current.play().catch(() => {});
            }
            logEvent('Remote encrypted audio stream connected', 'LOW');
          },
          onIceCandidate: (candidate) => {
            signalingRef.current?.sendIceCandidate(candidate);
          },
          onConnectionStateChange: (state) => {
            setWebrtcState(state);
            if (state === 'connected') {
              logEvent('Peer-to-peer connection established (DTLS-SRTP)', 'LOW');
            } else if (state === 'disconnected' || state === 'failed') {
              logEvent(`Peer connection state: ${state}`, 'MEDIUM');
            }
          },
          onError: (errMsg) => {
            showToast('error', errMsg);
            logEvent(errMsg, 'HIGH');
          },
        });
        webrtcRef.current = rtc;

        const localStream = await rtc.initialize();

        // 2. Initialize Client Stream Analyzer
        const analyzer = new ClientStreamAnalyzer(callId, {
          onTelemetryResult: (result: SecurityTelemetryResponse) => {
            setThreatScore(result.threat_score);
            setSeverity(result.severity);

            if (result.severity === 'HIGH' || result.severity === 'CRITICAL') {
              logEvent(`Anomaly detected: Threat score ${result.threat_score}`, result.severity);
            }

            if (result.call_terminated) {
              logEvent('Security severance initiated: Call terminated by security engine', 'CRITICAL');
              handleEndCall();
            }
          },
        });
        analyzerRef.current = analyzer;
        analyzer.attachAudioStream(localStream);
        analyzer.start(1500);

        // 3. Initialize WebSocket Signaling
        const sig = new SignalingClient(callId, {
          onOpen: () => {
            logEvent('Signaling relay connected', 'LOW');
          },
          onPeerConnected: (peerId) => {
            setPeerConnected(true);
            logEvent(`Peer connected: ${peerId.substring(0, 8)}...`, 'LOW');
            // Initiate offer if caller
            if (user?.id === callData.caller_id) {
              rtc.createOffer().then((sdp) => {
                sig.sendOffer(sdp);
                logEvent('WebRTC offer dispatched', 'LOW');
              });
            }
          },
          onPeerDisconnected: () => {
            setPeerConnected(false);
            logEvent('Peer disconnected from signaling channel', 'MEDIUM');
          },
          onOffer: async (sdp) => {
            logEvent('WebRTC offer received; generating answer', 'LOW');
            const answer = await rtc.handleOffer(sdp);
            sig.sendAnswer(answer);
          },
          onAnswer: async (sdp) => {
            logEvent('WebRTC answer received; setting remote description', 'LOW');
            await rtc.handleAnswer(sdp);
          },
          onIceCandidate: (candidate) => {
            rtc.handleIceCandidate(candidate);
          },
          onCallEnded: () => {
            logEvent('Remote party ended call session', 'LOW');
            showToast('info', 'Peer ended the call.');
            navigate('/app/calls');
          },
          onError: (err) => {
            console.warn('Signaling error:', err);
          },
        });

        signalingRef.current = sig;
        sig.connect();
      } catch (err: any) {
        showToast('error', err.message || 'Call initialization failed');
      }
    };

    setupSession();

    return () => {
      isMounted = false;
      analyzerRef.current?.stop();
      webrtcRef.current?.cleanup();
      signalingRef.current?.close();
    };
  }, [callId]);

  // Handle mute toggle
  const handleToggleMute = () => {
    if (webrtcRef.current) {
      const muted = webrtcRef.current.toggleMute();
      setIsMuted(muted);
      logEvent(muted ? 'Microphone muted' : 'Microphone unmuted', 'LOW');
    }
  };

  // Handle call end
  const handleEndCall = async () => {
    try {
      if (callId) {
        await api.post(`/calls/${callId}/end`);
      }
    } catch {
      // Ignore
    } finally {
      analyzerRef.current?.stop();
      webrtcRef.current?.cleanup();
      signalingRef.current?.close();
      showToast('info', 'Call terminated.');
      navigate('/app/calls');
    }
  };

  // Scenario toggle for hackathon demonstration
  const handleScenarioChange = (scen: DemoScenario) => {
    setDemoScenario(scen);
    analyzerRef.current?.setScenario(scen);

    if (scen === 'voice_clone') {
      setAiProbability(0.96);
      setSpeakerMatch(0.28);
      setLiveness(0.22);
      setEngineType('MOCK_DEMO_MODEL');
      logEvent('Simulated Scenario: Voice Clone Impersonation Attack triggered', 'CRITICAL');
    } else if (scen === 'suspicious') {
      setAiProbability(0.54);
      setSpeakerMatch(0.64);
      setLiveness(0.58);
      setEngineType('MOCK_DEMO_MODEL');
      logEvent('Simulated Scenario: Suspicious Speech Artifacts triggered', 'MEDIUM');
    } else if (scen === 'normal') {
      setAiProbability(0.03);
      setSpeakerMatch(0.94);
      setLiveness(0.96);
      setEngineType('MOCK_DEMO_MODEL');
      logEvent('Simulated Scenario: Normal Human Conversation baseline', 'LOW');
    } else {
      setEngineType('LOCAL_DSP_ANALYZER');
      logEvent('Switched to Live Client Audio Analysis', 'LOW');
    }
  };

  // Issue Acoustic Verification Challenge
  const handleIssueChallenge = async () => {
    if (!callId) return;
    try {
      const ch = await api.post<ChallengeResponse>(`/calls/${callId}/challenge`, {
        timeout_seconds: 60,
      });
      setActiveChallenge(ch);
      setShowChallengeModal(true);
      setChallengeResult(null);
      setSpokenResponse(ch.passphrase);
      logEvent(`Acoustic Passphrase Challenge issued: "${ch.passphrase}"`, 'HIGH');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to issue challenge');
    }
  };

  // Verify Spoken Challenge Response
  const handleVerifyChallenge = async () => {
    if (!callId || !activeChallenge) return;
    setVerifyingChallenge(true);
    try {
      const res = await api.post<ChallengeVerificationResponse>(
        `/calls/${callId}/challenge/verify`,
        {
          challenge_id: activeChallenge.challenge_id,
          spoken_phrase: spokenResponse,
          liveness_score: liveness || 0.95,
        }
      );
      setChallengeResult(res);
      if (res.verified) {
        showToast('success', 'Identity challenge verified successfully!');
        logEvent('Identity challenge VERIFIED: Threat score mitigated', 'LOW');
        setThreatScore((prev) => Math.max(0, prev + res.threat_score_impact));
        setSeverity('LOW');
      } else {
        showToast('error', 'Challenge verification failed.');
        logEvent('Identity challenge FAILED: Impersonation risk remains', 'CRITICAL');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Verification error');
    } finally {
      setVerifyingChallenge(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio element for remote WebRTC stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Demo Mode Banner when simulated scenario is running */}
      {demoScenario !== 'live' && <DemoBanner scenario={demoScenario} />}

      {/* High / Critical Threat Alert Banner */}
      {(severity === 'HIGH' || severity === 'CRITICAL') && (
        <div className="bg-cyber-crimson/15 border-2 border-cyber-crimson rounded-2xl p-4 sm:p-5 animate-threat-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-cyber-crimson uppercase tracking-wider">
                ⚠️ VOICE AUTHENTICITY ALERT — POTENTIAL CLONE DETECTED
              </div>
              <p className="text-xs text-cyber-muted mt-0.5 max-w-xl">
                Synthetic speech characteristics detected. Threat score reached <strong className="text-cyber-crimson font-mono">{Math.round(threatScore)}/100</strong>. Identity verification recommended before sharing sensitive credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              onClick={handleIssueChallenge}
              className="py-2 px-3.5 rounded-xl bg-orange-500 text-white font-mono font-bold text-xs hover:bg-orange-600 transition-colors shadow-lg"
            >
              Verify Identity
            </button>
            <button
              onClick={handleEndCall}
              className="py-2 px-3.5 rounded-xl bg-cyber-crimson text-white font-mono font-bold text-xs hover:bg-red-700 transition-colors shadow-lg"
            >
              End Call Now
            </button>
          </div>
        </div>
      )}

      {/* Main Call Interface Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Video/Audio Shield Stage */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-cyber-surface border border-cyber-border rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between min-h-[460px] relative overflow-hidden shadow-2xl">
            {/* Top Bar inside Call Stage */}
            <div className="w-full flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-ping" />
                <span className="text-xs font-mono text-cyber-muted uppercase">
                  DTLS-SRTP ENCRYPTED CALL
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono bg-cyber-card/80 border border-cyber-border px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-cyber-cyan" />
                <span className="font-bold text-cyber-text">{formatDuration(callDuration)}</span>
              </div>
            </div>

            {/* Center Stage: Dynamic Security Shield */}
            <div className="flex flex-col items-center my-6 z-10">
              <ThreatShield score={threatScore} severity={severity} size="lg" />

              <h2 className="text-xl font-bold text-cyber-text mt-4 tracking-wide">
                {call ? `Peer ${call.receiver_id.substring(0, 8)}...` : 'Connecting Peer...'}
              </h2>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono text-cyber-muted">
                  WebRTC State: <strong className="text-cyber-cyan uppercase">{webrtcState}</strong>
                </span>
                <span className="text-cyber-muted">•</span>
                <span className="text-xs font-mono text-cyber-muted">
                  Engine: <strong className="text-cyber-cyan">{engineType}</strong>
                </span>
              </div>
            </div>

            {/* Acoustic Biometric Meters */}
            <div className="w-full z-10">
              <AcousticMeters
                aiProbability={aiProbability}
                speakerMatchScore={speakerMatch}
                livenessScore={liveness}
              />
            </div>

            {/* Bottom Call Controls */}
            <div className="flex items-center justify-center gap-4 mt-6 z-10">
              {/* Mute Button */}
              <button
                onClick={handleToggleMute}
                className={`p-4 rounded-2xl border transition-all ${
                  isMuted
                    ? 'bg-cyber-amber/20 border-cyber-amber text-cyber-amber'
                    : 'bg-cyber-card border-cyber-border text-cyber-text hover:border-cyber-cyan/50'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="py-4 px-8 rounded-2xl bg-cyber-crimson hover:bg-red-600 text-white font-mono font-bold text-xs flex items-center gap-2.5 shadow-crimson-glow transition-all uppercase tracking-wider"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Secure Call</span>
              </button>

              {/* Verify Challenge Button */}
              <button
                onClick={handleIssueChallenge}
                className="p-4 rounded-2xl bg-cyber-card border border-cyber-border text-cyber-cyan hover:border-cyber-cyan/60 transition-colors"
                title="Issue Acoustic Identity Challenge"
              >
                <KeyRound className="w-6 h-6" />
              </button>
            </div>

            {/* Background Ambient Glow */}
            <div
              className="absolute inset-0 pointer-events-none transition-colors duration-700 opacity-20"
              style={{
                background:
                  severity === 'CRITICAL'
                    ? 'radial-gradient(circle at center, #EF4444 0%, transparent 70%)'
                    : severity === 'HIGH'
                    ? 'radial-gradient(circle at center, #FB923C 0%, transparent 70%)'
                    : 'radial-gradient(circle at center, #06B6D4 0%, transparent 70%)',
              }}
            />
          </div>

          {/* Hackathon Demo Controls Toolbar */}
          <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyber-muted">
              <Radio className="w-4 h-4 text-cyber-cyan" />
              <span>TEST SCENARIO GENERATOR:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <button
                onClick={() => handleScenarioChange('live')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  demoScenario === 'live'
                    ? 'bg-cyber-cyan text-cyber-bg font-bold border-cyber-cyan'
                    : 'bg-cyber-card text-cyber-muted border-cyber-border hover:text-cyber-text'
                }`}
              >
                Live Mic
              </button>

              <button
                onClick={() => handleScenarioChange('normal')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  demoScenario === 'normal'
                    ? 'bg-cyber-emerald text-cyber-bg font-bold border-cyber-emerald'
                    : 'bg-cyber-card text-cyber-muted border-cyber-border hover:text-cyber-text'
                }`}
              >
                Normal
              </button>

              <button
                onClick={() => handleScenarioChange('suspicious')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  demoScenario === 'suspicious'
                    ? 'bg-cyber-amber text-cyber-bg font-bold border-cyber-amber'
                    : 'bg-cyber-card text-cyber-muted border-cyber-border hover:text-cyber-text'
                }`}
              >
                Suspicious
              </button>

              <button
                onClick={() => handleScenarioChange('voice_clone')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  demoScenario === 'voice_clone'
                    ? 'bg-cyber-crimson text-white font-bold border-cyber-crimson shadow-crimson-glow'
                    : 'bg-cyber-card text-cyber-muted border-cyber-border hover:text-cyber-text'
                }`}
              >
                Voice Clone
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Live Security Event Timeline & Privacy Details */}
        <div className="space-y-6">
          {/* Security Timeline */}
          <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-5 flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-cyber-border mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyber-cyan" />
                <h3 className="text-xs font-bold text-cyber-text uppercase font-mono tracking-wider">
                  Security Timeline
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyber-emerald bg-cyber-emerald/10 px-2 py-0.5 rounded border border-cyber-emerald/20">
                LIVE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs font-mono">
              {timeline.length === 0 ? (
                <div className="text-center py-16 text-cyber-muted text-xs">
                  Monitoring session events...
                </div>
              ) : (
                timeline.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-xl bg-cyber-card/60 border border-cyber-border/70 flex items-start gap-2.5"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        evt.severity === 'CRITICAL'
                          ? 'bg-cyber-crimson'
                          : evt.severity === 'HIGH'
                          ? 'bg-orange-400'
                          : evt.severity === 'MEDIUM'
                          ? 'bg-cyber-amber'
                          : 'bg-cyber-emerald'
                      }`}
                    />
                    <div className="flex-1 leading-snug">
                      <div className="text-cyber-text text-[11px]">{evt.message}</div>
                      <div className="text-[10px] text-cyber-muted mt-0.5">{evt.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Zero-Server-Audio Privacy Invariant Card */}
          <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyber-cyan mb-2">
              <Lock className="w-4 h-4" />
              <span className="font-bold uppercase">Zero-Server-Audio Privacy</span>
            </div>
            <p className="text-xs text-cyber-muted leading-relaxed">
              Call audio is encrypted with DTLS-SRTP and flows directly to your peer. Telemetry reports sent to VoxShield contain only synthetic probability metrics—never raw audio recordings.
            </p>
          </div>
        </div>
      </div>

      {/* Identity Verification Challenge Modal */}
      {showChallengeModal && activeChallenge && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-surface border border-cyber-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-cyber-text font-mono uppercase">
                  Identity Verification Challenge
                </h3>
                <p className="text-xs text-cyber-muted">Acoustic passphrase authentication</p>
              </div>
            </div>

            <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 my-4 text-center">
              <div className="text-xs text-cyber-muted font-mono mb-1">PROMPT PHRASE TO SPEAK:</div>
              <div className="text-lg font-bold font-mono text-cyber-cyan tracking-wider">
                "{activeChallenge.passphrase}"
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">
                  Peer Response Transcription
                </label>
                <input
                  type="text"
                  value={spokenResponse}
                  onChange={(e) => setSpokenResponse(e.target.value)}
                  placeholder="Spoken words..."
                  className="w-full px-3.5 py-2.5 bg-cyber-bg border border-cyber-border rounded-xl text-xs text-cyber-text font-mono focus:border-cyber-cyan focus:outline-none"
                />
              </div>

              {challengeResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono ${
                    challengeResult.verified
                      ? 'bg-cyber-emerald/15 border-cyber-emerald/40 text-cyber-emerald'
                      : 'bg-cyber-crimson/15 border-cyber-crimson/40 text-cyber-crimson'
                  }`}
                >
                  <div className="font-bold">
                    {challengeResult.verified ? '✓ VERIFICATION PASSED' : '✗ VERIFICATION FAILED'}
                  </div>
                  <div className="text-[11px] mt-0.5">{challengeResult.details}</div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowChallengeModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-cyber-card border border-cyber-border text-xs font-mono text-cyber-muted hover:text-cyber-text"
              >
                Close
              </button>
              <button
                onClick={handleVerifyChallenge}
                disabled={verifyingChallenge}
                className="flex-1 py-2.5 rounded-xl bg-cyber-cyan text-cyber-bg text-xs font-mono font-bold uppercase shadow-cyan-glow hover:bg-cyan-300 disabled:opacity-50"
              >
                {verifyingChallenge ? 'Verifying...' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
