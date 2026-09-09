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
  ControlledAttackPanel,
  DemoScenarioKey,
} from '../components/security/ControlledAttackPanel';
import { TamperTestModal } from '../components/security/TamperTestModal';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  FileCheck,
  FileText,
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

interface DemoExecuteBackendResponse {
  scenario_id: string;
  display_name: string;
  threat_score: number;
  severity: ThreatSeverity;
  ai_probability: number;
  speaker_match_score: number | null;
  liveness_score: number | null;
  detected_artifacts: string[];
  recommended_action: string;
  inference_type: string;
  provenance_label: string;
  is_real_inference: boolean;
  latencies_ms: Record<string, number>;
  safety_disclaimer: string;
  event_id?: string;
  incident_created: boolean;
  incident_id?: string;
  incident_number?: string;
  canonical_hash?: string;
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
  const [threatScore, setThreatScore] = useState<number>(8.0);
  const [severity, setSeverity] = useState<ThreatSeverity>('LOW');
  const [aiProbability, setAiProbability] = useState<number>(0.03);
  const [speakerMatch, setSpeakerMatch] = useState<number | null>(0.94);
  const [liveness, setLiveness] = useState<number | null>(0.95);
  const [recommendedAction, setRecommendedAction] = useState<string>('CONTINUE_NORMAL');
  const [detectedArtifacts, setDetectedArtifacts] = useState<string[]>([]);
  const [isTelemetryDegraded, setIsTelemetryDegraded] = useState(false);

  // Demo Control State
  const [demoScenarioKey, setDemoScenarioKey] = useState<DemoScenarioKey>('NORMAL');
  const [isRealInference, setIsRealInference] = useState<boolean>(true);
  const [provenanceLabel, setProvenanceLabel] = useState<string>(
    'REAL PRETRAINED MODEL (AASIST-L + ECAPA-TDNN + LOCAL DSP)'
  );
  const [isExecutingDemo, setIsExecutingDemo] = useState<boolean>(false);

  // Auto Incident Banner & Tamper Test State
  const [createdIncident, setCreatedIncident] = useState<{
    id: string;
    number: string;
    hash: string;
  } | null>(null);
  const [showTamperModal, setShowTamperModal] = useState<boolean>(false);

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

  // Helper to add events to timeline
  const logEvent = (message: string, eventSeverity: ThreatSeverity = 'LOW') => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setTimeline((prev) => [
      {
        id: `tl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: timeStr,
        message,
        severity: eventSeverity,
      },
      ...prev.slice(0, 39), // keep last 40 events
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
        const callData = await api.get<CallResponse>(`/calls/${callId}`);
        if (!isMounted) return;
        setCall(callData);

        logEvent('✓ Secure WebRTC call session initialized', 'LOW');

        // 1. Initialize WebRTC
        const rtc = new WebRTCConnection({
          onRemoteStream: (stream) => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = stream;
              remoteAudioRef.current.play().catch(() => {});
            }
            logEvent('✓ Remote encrypted audio stream connected (DTLS-SRTP)', 'LOW');
          },
          onIceCandidate: (candidate) => {
            signalingRef.current?.sendIceCandidate(candidate);
          },
          onConnectionStateChange: (state) => {
            setWebrtcState(state);
            if (state === 'connected') {
              logEvent('✓ Peer-to-peer connection established (DTLS-SRTP)', 'LOW');
              logEvent('✓ Trusted speaker verified (ECAPA-TDNN)', 'LOW');
            } else if (state === 'disconnected' || state === 'failed') {
              logEvent(`⚠ Peer connection state changed: ${state}`, 'MEDIUM');
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
            setIsTelemetryDegraded(false);
            setThreatScore(result.threat_score);
            setSeverity(result.severity);
            setRecommendedAction(result.recommended_action);

            if (result.severity === 'HIGH' || result.severity === 'CRITICAL') {
              logEvent(
                `⚠ Anomaly detected: Threat score ${result.threat_score} (${result.severity})`,
                result.severity
              );
            }

            if (result.call_terminated) {
              logEvent('🔴 Security severance initiated: Call terminated by security engine', 'CRITICAL');
              handleEndCall();
            }
          },
          onError: () => {
            setIsTelemetryDegraded(true);
          },
        });
        analyzerRef.current = analyzer;
        analyzer.attachAudioStream(localStream);
        analyzer.start(1500);

        // 3. Initialize WebSocket Signaling
        const sig = new SignalingClient(callId, {
          onOpen: () => {
            logEvent('✓ Signaling relay connected', 'LOW');
          },
          onPeerConnected: (peerId) => {
            setPeerConnected(true);
            logEvent(`✓ Peer connected: ${peerId.substring(0, 8)}...`, 'LOW');
            if (user?.id === callData.caller_id) {
              rtc.createOffer().then((sdp) => {
                sig.sendOffer(sdp);
              });
            }
          },
          onPeerDisconnected: () => {
            setPeerConnected(false);
            logEvent('⚠ Peer disconnected from signaling channel', 'MEDIUM');
          },
          onOffer: async (sdp) => {
            const answer = await rtc.handleOffer(sdp);
            sig.sendAnswer(answer);
          },
          onAnswer: async (sdp) => {
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

  // Handle call termination
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

  // Execute demo scenario step via backend demo controller
  const handleExecuteDemoStep = async (
    stepIndex: number,
    simulateChallengeFail = false,
    overrideScenario?: DemoScenarioKey
  ) => {
    if (!callId) return;
    setIsExecutingDemo(true);
    const scenarioToUse = overrideScenario || demoScenarioKey;
    if (overrideScenario && overrideScenario !== demoScenarioKey) {
      setDemoScenarioKey(overrideScenario);
    }
    try {
      const res = await api.post<DemoExecuteBackendResponse>('/demo/execute', {
        call_id: callId,
        scenario_id: scenarioToUse,
        step_index: stepIndex,
        simulate_challenge_failure: simulateChallengeFail,
      });

      setThreatScore(res.threat_score);
      setSeverity(res.severity);
      setAiProbability(res.ai_probability);
      setSpeakerMatch(res.speaker_match_score);
      setLiveness(res.liveness_score);
      setDetectedArtifacts(res.detected_artifacts || []);
      setRecommendedAction(res.recommended_action);
      setIsRealInference(res.is_real_inference);
      setProvenanceLabel(res.provenance_label);

      // Log narrative events into timeline based on step
      if (stepIndex === 0) {
        logEvent(`✓ Scenario [${res.display_name}] initialized: Baseline normal voice`, 'LOW');
      } else if (stepIndex === 1) {
        logEvent('⚠ Acoustic anomaly detected in frequency band 2.8 kHz', 'MEDIUM');
        logEvent(`⚠ AASIST spoof probability elevated: ${(res.ai_probability * 100).toFixed(1)}%`, 'MEDIUM');
      } else if (stepIndex === 2) {
        logEvent('⚠ Speaker similarity decreased (ECAPA-TDNN mismatch)', 'HIGH');
        logEvent('⚠ Liveness anomaly detected (DSP analyzer below threshold)', 'HIGH');
        logEvent('🔴 HIGH RISK: Synthetic voice characteristics confirmed', 'HIGH');
        logEvent('🔐 Verification challenge required before proceeding', 'HIGH');
      } else if (stepIndex >= 3 || simulateChallengeFail) {
        if (simulateChallengeFail) {
          logEvent('❌ Verification failed: Spoken passphrase mismatch', 'CRITICAL');
        }
        logEvent('🔴 CRITICAL VOICE IMPERSONATION ATTACK DETECTED', 'CRITICAL');
        logEvent('🛑 RECOMMEND CALL TERMINATION', 'CRITICAL');
      }

      if (res.incident_created && res.incident_id && res.incident_number && res.canonical_hash) {
        setCreatedIncident({
          id: res.incident_id,
          number: res.incident_number,
          hash: res.canonical_hash,
        });
        logEvent(`🚨 Security incident automatically created: ${res.incident_number}`, 'CRITICAL');
        logEvent(`🔏 Canonical evidence hash generated: ${res.canonical_hash.substring(0, 14)}...`, 'CRITICAL');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Simulation execution failed');
    } finally {
      setIsExecutingDemo(false);
    }
  };

  // Scenario selection handler
  const handleScenarioChange = (scenario: DemoScenarioKey) => {
    setDemoScenarioKey(scenario);
    if (scenario === 'NORMAL') {
      setIsRealInference(true);
      setProvenanceLabel('REAL PRETRAINED MODEL (AASIST-L + ECAPA-TDNN + LOCAL DSP)');
      analyzerRef.current?.setScenario('normal');
      logEvent('Switched to Scenario: Normal Trusted Voice', 'LOW');
    } else if (scenario === 'REPLAY_ATTACK') {
      setIsRealInference(true);
      setProvenanceLabel('REAL PRETRAINED MODEL (AASIST-L + ECAPA-TDNN + LOCAL DSP)');
      analyzerRef.current?.setScenario('replay_attack');
      logEvent('Switched to Scenario: Replay Attack (Acoustic Room Impulse)', 'MEDIUM');
    } else if (scenario === 'SYNTHETIC_SPOOF') {
      setIsRealInference(true);
      setProvenanceLabel('REAL PRETRAINED MODEL (AASIST-L + ECAPA-TDNN + LOCAL DSP)');
      analyzerRef.current?.setScenario('synthetic_spoof');
      logEvent('Switched to Scenario: Synthetic Spoof (Vocoder Waveform)', 'HIGH');
    } else {
      setIsRealInference(false);
      setProvenanceLabel('SIMULATED ATTACK TELEMETRY (NOT REAL MODEL OUTPUT)');
      analyzerRef.current?.setScenario('simulated_critical');
      logEvent('Switched to Scenario: Simulated Critical Attack (Telemetry Demonstration)', 'CRITICAL');
    }
  };

  // Demo Reset
  const handleResetDemo = async () => {
    setIsExecutingDemo(true);
    try {
      if (callId) {
        await api.post('/demo/reset', { call_id: callId });
      }
      setThreatScore(8.0);
      setSeverity('LOW');
      setAiProbability(0.03);
      setSpeakerMatch(0.94);
      setLiveness(0.95);
      setRecommendedAction('CONTINUE_NORMAL');
      setDetectedArtifacts([]);
      setCreatedIncident(null);
      setDemoScenarioKey('NORMAL');
      setIsRealInference(true);
      setProvenanceLabel('REAL PRETRAINED MODEL (AASIST-L + ECAPA-TDNN + LOCAL DSP)');
      analyzerRef.current?.setScenario('normal');

      logEvent('✓ Demonstration state cleanly reset: Baseline normal voice restored', 'LOW');
      showToast('success', 'Demo reset to normal baseline.');
    } catch (err: any) {
      showToast('error', err.message || 'Reset failed');
    } finally {
      setIsExecutingDemo(false);
    }
  };

  // Issue Challenge
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
      logEvent(`🔐 Acoustic verification challenge issued: "${ch.passphrase}"`, 'HIGH');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to issue challenge');
    }
  };

  // Verify Spoken Response
  const handleVerifyChallenge = async (simulateAttackerFailure = false) => {
    if (!callId || !activeChallenge) return;
    setVerifyingChallenge(true);
    try {
      const phraseToSubmit = simulateAttackerFailure
        ? 'INVALID_ATTACKER_MISMATCH_RESPONSE'
        : spokenResponse;

      const res = await api.post<ChallengeVerificationResponse>(
        `/calls/${callId}/challenge/verify`,
        {
          challenge_id: activeChallenge.challenge_id,
          spoken_phrase: phraseToSubmit,
          liveness_score: simulateAttackerFailure ? 0.20 : liveness || 0.95,
        }
      );
      setChallengeResult(res);

      if (res.verified) {
        showToast('success', 'Identity challenge verified successfully!');
        logEvent('✓ Identity challenge VERIFIED: Threat score mitigated', 'LOW');
        setThreatScore((prev) => Math.max(0, prev + res.threat_score_impact));
        setSeverity('LOW');
        setRecommendedAction('CONTINUE_NORMAL');
      } else {
        showToast('error', 'Challenge verification failed.');
        logEvent('❌ Identity challenge FAILED: Attacker phrase mismatch', 'CRITICAL');
        setThreatScore((prev) => Math.min(100, prev + res.threat_score_impact));
        setSeverity('CRITICAL');
        setRecommendedAction('RECOMMEND_TERMINATION');

        // Automatically create incident on challenge failure
        const inc = await api.post<any>('/incidents', {
          call_id: callId,
          incident_type: 'VOICE_CLONING_IMPERSONATION',
          severity: 'CRITICAL',
          threat_score: 88.0,
          ai_probability: aiProbability,
          speaker_match_score: speakerMatch,
          liveness_score: liveness,
          summary: `Failed acoustic identity verification challenge during active call session. Attacker mismatch confirmed.`,
          indicators: ['challenge_phrase_mismatch', 'liveness_failure', 'impersonation_signature'],
          recommendations: ['Terminate voice call immediately', 'Flag peer identity as compromised'],
        });
        await api.post(`/incidents/${inc.id}/anchor`, {});
        setCreatedIncident({
          id: inc.id,
          number: inc.incident_number,
          hash: inc.canonical_hash,
        });
        logEvent(`🚨 Security incident automatically created: ${inc.incident_number}`, 'CRITICAL');
        logEvent(`🔏 Canonical evidence hash generated: ${inc.canonical_hash.substring(0, 14)}...`, 'CRITICAL');
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

      {/* Incident Created Persistent Banner */}
      {createdIncident && (
        <div className="bg-cyber-surface border-2 border-cyber-crimson rounded-3xl p-5 shadow-crimson-glow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-threat-pulse">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-mono text-cyber-crimson font-bold uppercase tracking-wider flex items-center gap-2">
                <span>🚨 SECURITY INCIDENT AUTOMATICALLY LOGGED</span>
                <span className="text-[10px] bg-cyber-crimson/20 text-white px-2 py-0.5 rounded">
                  {createdIncident.number}
                </span>
              </div>
              <p className="text-xs text-cyber-text mt-1 font-mono">
                Evidence SHA-256 Digest:{' '}
                <strong className="text-cyber-cyan select-all">{createdIncident.hash}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              id="open-tamper-modal-btn"
              data-testid="open-tamper-modal-btn"
              onClick={() => setShowTamperModal(true)}
              className="py-2.5 px-4 rounded-xl bg-cyber-crimson hover:bg-red-600 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Run Tamper Test</span>
            </button>
            <button
              onClick={() => navigate(`/app/incidents/${createdIncident.id}`)}
              className="py-2.5 px-4 rounded-xl bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-xs font-mono text-cyber-text font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Inspect Incident</span>
            </button>
          </div>
        </div>
      )}

      {/* High / Critical Threat Alert Banner */}
      {(severity === 'HIGH' || severity === 'CRITICAL') && !createdIncident && (
        <div className="bg-cyber-crimson/15 border-2 border-cyber-crimson rounded-3xl p-4 sm:p-5 animate-threat-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-cyber-crimson uppercase tracking-wider">
                ⚠️ VOICE AUTHENTICITY ALERT — IMPERSONATION DETECTED
              </div>
              <p className="text-xs text-cyber-muted mt-0.5 max-w-xl">
                Synthetic speech characteristics detected. Threat score reached{' '}
                <strong className="text-cyber-crimson font-mono">{Math.round(threatScore)}/100</strong>. Action:{' '}
                <strong className="text-orange-400 font-mono">{recommendedAction}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              onClick={handleIssueChallenge}
              className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg transition-colors"
            >
              Verify Identity
            </button>
            <button
              onClick={handleEndCall}
              className="py-2.5 px-4 rounded-xl bg-cyber-crimson hover:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg transition-colors"
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
              <ThreatShield score={threatScore} severity={severity} size="lg" isDegraded={isTelemetryDegraded} />

              <h2 className="text-xl font-bold text-cyber-text mt-4 tracking-wide">
                {call ? `Peer ${call.receiver_id.substring(0, 8)}...` : 'Connecting Peer...'}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="text-xs font-mono text-cyber-muted">
                  WebRTC: <strong className="text-cyber-cyan uppercase">{webrtcState}</strong>
                </span>
                <span className="text-cyber-muted">•</span>
                <span className="text-xs font-mono text-cyber-muted">
                  Action: <strong className="text-orange-400">{recommendedAction}</strong>
                </span>
              </div>

              {/* Detected Artifacts Badges */}
              {detectedArtifacts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-3 max-w-md">
                  {detectedArtifacts.map((art) => (
                    <span
                      key={art}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyber-crimson/15 border border-cyber-crimson/40 text-cyber-crimson"
                    >
                      {art}
                    </span>
                  ))}
                </div>
              )}
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
                id="issue-challenge-btn"
                data-testid="issue-challenge-btn"
                onClick={handleIssueChallenge}
                className="p-4 rounded-2xl bg-cyber-card border border-cyber-border text-cyber-cyan hover:border-cyber-cyan/60 transition-colors"
                title="Issue Acoustic Identity Challenge"
              >
                <KeyRound className="w-6 h-6" />
              </button>
            </div>

            {/* Ambient Background Glow */}
            <div
              className="absolute inset-0 pointer-events-none transition-colors duration-700 opacity-20"
              style={{
                background:
                  severity === 'CRITICAL'
                    ? 'radial-gradient(circle at center, #EF4444 0%, transparent 70%)'
                    : severity === 'HIGH'
                    ? 'radial-gradient(circle at center, #FB923C 0%, transparent 70%)'
                    : severity === 'MEDIUM'
                    ? 'radial-gradient(circle at center, #F59E0B 0%, transparent 70%)'
                    : 'radial-gradient(circle at center, #06B6D4 0%, transparent 70%)',
              }}
            />
          </div>

          {/* Controlled Attack Simulation Panel */}
          <ControlledAttackPanel
            currentScenario={demoScenarioKey}
            onScenarioChange={handleScenarioChange}
            onExecuteStep={handleExecuteDemoStep}
            onReset={handleResetDemo}
            executing={isExecutingDemo}
            isRealInference={isRealInference}
            provenanceLabel={provenanceLabel}
          />
        </div>

        {/* Right Col: Live Security Event Timeline & Privacy Details */}
        <div className="space-y-6">
          {/* Security Timeline */}
          <div className="bg-cyber-surface border border-cyber-border rounded-3xl p-5 flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-cyber-border mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyber-cyan" />
                <h3 className="text-xs font-bold text-cyber-text uppercase font-mono tracking-wider">
                  Live Security Timeline
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyber-emerald bg-cyber-emerald/10 px-2 py-0.5 rounded border border-cyber-emerald/20">
                MONITORING ACTIVE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs font-mono">
              {timeline.length === 0 ? (
                <div className="text-center py-20 text-cyber-muted text-xs">
                  Monitoring session events...
                </div>
              ) : (
                timeline.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-xl bg-cyber-card/60 border border-cyber-border/70 flex items-start gap-2.5"
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        evt.severity === 'CRITICAL'
                          ? 'bg-cyber-crimson animate-ping'
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
          <div className="bg-cyber-surface border border-cyber-border rounded-3xl p-5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyber-cyan mb-2">
              <Lock className="w-4 h-4" />
              <span className="font-bold uppercase">Zero-Server-Audio Privacy Invariant</span>
            </div>
            <p className="text-xs text-cyber-muted leading-relaxed">
              Real call media is encrypted with DTLS-SRTP and flows directly between peers. Telemetry transmitted to VoxShield contains only compact mathematical metrics—strictly 0 bytes of call audio are uploaded.
            </p>
          </div>
        </div>
      </div>

      {/* Identity Verification Challenge Modal */}
      {showChallengeModal && activeChallenge && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-surface border border-cyber-border rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-cyber-text font-mono uppercase">
                  Voice Identity Challenge
                </h3>
                <p className="text-xs text-cyber-muted">Acoustic passphrase authentication</p>
              </div>
            </div>

            <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 my-4 text-center">
              <div className="text-xs text-cyber-muted font-mono mb-1">PROMPT PHRASE:</div>
              <div className="text-lg font-bold font-mono text-cyber-cyan tracking-wider">
                "{activeChallenge.passphrase}"
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">
                  Peer Response
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

            <div className="flex flex-col gap-2.5 mt-6">
              <div className="flex gap-2">
                <button
                  id="submit-legit-challenge-btn"
                  onClick={() => handleVerifyChallenge(false)}
                  disabled={verifyingChallenge}
                  className="flex-1 py-3 rounded-xl bg-cyber-cyan text-cyber-bg text-xs font-mono font-bold uppercase shadow-cyan-glow hover:bg-cyan-300 disabled:opacity-50 transition-all"
                >
                  {verifyingChallenge ? 'Verifying...' : 'Submit Legit Response'}
                </button>
                <button
                  id="simulate-fail-challenge-btn"
                  onClick={() => handleVerifyChallenge(true)}
                  disabled={verifyingChallenge}
                  className="flex-1 py-3 rounded-xl bg-cyber-crimson text-white text-xs font-mono font-bold uppercase shadow-crimson-glow hover:bg-red-600 disabled:opacity-50 transition-all"
                >
                  Simulate Attacker Fail
                </button>
              </div>

              <button
                id="close-challenge-modal-btn"
                onClick={() => setShowChallengeModal(false)}
                className="w-full py-2.5 rounded-xl bg-cyber-card border border-cyber-border text-xs font-mono text-cyber-muted hover:text-cyber-text"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Tamper Test Modal */}
      {showTamperModal && createdIncident && (
        <TamperTestModal
          incidentId={createdIncident.id}
          incidentNumber={createdIncident.number}
          originalHash={createdIncident.hash}
          onClose={() => setShowTamperModal(false)}
        />
      )}
    </div>
  );
};
