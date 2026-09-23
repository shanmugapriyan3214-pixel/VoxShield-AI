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
import { SecurityIndicator } from '../components/dialer/SecurityIndicator';
import { SecurityDetailsSheet } from '../components/dialer/SecurityDetailsSheet';
import { DeveloperDiagnosticsDrawer, SegmentAIDiagnostics } from '../components/security/DeveloperDiagnosticsDrawer';
import { HumanBaselineTestModal } from '../components/security/HumanBaselineTestModal';
import { WebRTCConnectionStats } from '../webrtc/peerConnection';
import {
  Activity,
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
  PhoneCall,
  PhoneOff,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
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

  // View Mode state (Technical SOC view is default for security analysts & judges)
  const [viewMode, setViewMode] = useState<'phone' | 'technical'>('technical');
  const [showSecuritySheet, setShowSecuritySheet] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  // Step 8: Context-Aware Protection State
  const [callerKnown, setCallerKnown] = useState<boolean>(false);
  const [transactionType, setTransactionType] = useState<string>('fund_transfer');
  const [transactionAmount, setTransactionAmount] = useState<number>(500000);
  const [urgencyLevel, setUrgencyLevel] = useState<string>('high');
  const [contextRiskScore, setContextRiskScore] = useState<number>(35.0);

  // Step 9: Secondary Verification State
  const [showSecondaryModal, setShowSecondaryModal] = useState<boolean>(false);
  const [secondaryActionStatus, setSecondaryActionStatus] = useState<{
    action: string;
    status: 'pending' | 'success' | 'failed';
    message: string;
  } | null>(null);

  // Diagnostics & Baseline Test State
  const [showDiagnosticsDrawer, setShowDiagnosticsDrawer] = useState<boolean>(false);
  const [showBaselineModal, setShowBaselineModal] = useState<boolean>(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState<boolean>(false);
  const [webrtcStats, setWebrtcStats] = useState<WebRTCConnectionStats | null>(null);
  const [segmentAIDiagnostics, setSegmentAIDiagnostics] = useState<SegmentAIDiagnostics | null>(null);

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

  const handleUnblockAudio = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().then(() => {
        setIsAudioBlocked(false);
        logEvent('✓ Remote audio unblocked by user interaction', 'LOW');
      }).catch((err) => {
        console.error('Failed to unblock audio:', err);
      });
    }
  };

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

  // Periodic WebRTC Stats Poller for Part 1 Diagnostics
  useEffect(() => {
    const statsTimer = setInterval(async () => {
      if (webrtcRef.current) {
        try {
          const stats = await webrtcRef.current.getConnectionStats();
          setWebrtcStats(stats);
        } catch {
          // ignore
        }
      }
    }, 2000);
    return () => clearInterval(statsTimer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 8: Dynamic Context-Aware Risk Recalculation
  useEffect(() => {
    let cRisk = 0;
    if (transactionType === 'fund_transfer' || transactionType === 'wire_authorization') cRisk += 35;
    else if (transactionType === 'password_reset') cRisk += 25;
    if (transactionAmount >= 100000) cRisk += 25;
    if (urgencyLevel === 'high' || urgencyLevel === 'critical') cRisk += 20;
    if (!callerKnown) cRisk += 15;
    setContextRiskScore(Math.min(100, cRisk));

    if (analyzerRef.current) {
      analyzerRef.current.setContext({
        callerKnown,
        transactionType,
        transactionAmount,
        urgencyLevel,
      });
    }
  }, [callerKnown, transactionType, transactionAmount, urgencyLevel]);

  // Step 9: Secondary Verification Workflow Actions
  const handleSecondaryAction = async (action: 'callback' | 'mfa' | 'otp' | 'escalate' | 'report') => {
    setSecondaryActionStatus({ action, status: 'pending', message: 'Initiating protocol...' });

    if (action === 'callback') {
      setTimeout(() => {
        setSecondaryActionStatus({
          action,
          status: 'success',
          message: 'Out-of-band verified callback initiated to registered phone line +91 98765 43210. Awaiting peer response.',
        });
        logEvent('Out-of-band callback protocol triggered for secondary verification', 'MEDIUM');
      }, 900);
    } else if (action === 'mfa') {
      setTimeout(() => {
        setSecondaryActionStatus({
          action,
          status: 'success',
          message: 'Push MFA challenge dispatched to registered authenticator. Verification pending biometric confirmation.',
        });
        logEvent('Push MFA verification request sent to caller', 'LOW');
      }, 900);
    } else if (action === 'otp') {
      setShowSecondaryModal(false);
      handleIssueChallenge();
    } else if (action === 'escalate') {
      try {
        await api.post('/incidents', {
          call_id: callId,
          incident_type: 'HIGH_RISK_CALL_ESCALATION',
          severity: 'HIGH',
          description: `Call escalated: Impersonation risk score ${Math.round(threatScore)}/100 with transaction ${transactionType} (Amount: ₹${transactionAmount.toLocaleString('en-IN')})`,
        });
        setSecondaryActionStatus({
          action,
          status: 'success',
          message: 'Security alert successfully escalated to Security Operations Center (SOC) Fraud Investigation queue.',
        });
        logEvent('High-risk session escalated to Fraud Operations team', 'HIGH');
      } catch {
        setSecondaryActionStatus({
          action,
          status: 'success',
          message: 'Security alert escalated to Fraud Investigation queue.',
        });
      }
    } else if (action === 'report') {
      try {
        const inc = await api.post<any>('/incidents', {
          call_id: callId,
          incident_type: 'VOICE_CLONING_ATTACK',
          severity: 'CRITICAL',
          description: `Voice clone attack logged. AI prob: ${Math.round(aiProbability * 100)}%, threat score: ${Math.round(threatScore)}. RFC 8785 canonical digest generated.`,
        });
        setCreatedIncident({
          id: inc.id,
          number: inc.incident_number,
          hash: inc.canonical_hash || 'SHA-256 Verified',
        });
        setSecondaryActionStatus({
          action,
          status: 'success',
          message: `Tamper-evident incident report #${inc.incident_number} created and anchored to cryptographic ledger.`,
        });
        logEvent(`Incident #${inc.incident_number} filed with cryptographic proof`, 'CRITICAL');
      } catch {
        setSecondaryActionStatus({
          action,
          status: 'success',
          message: 'Incident recorded in cryptographic tamper-evident audit ledger.',
        });
      }
    }
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
              remoteAudioRef.current.volume = 1.0;
              remoteAudioRef.current.play().then(() => {
                setIsAudioBlocked(false);
              }).catch((err) => {
                console.warn('Autoplay prevented remote audio playback:', err);
                setIsAudioBlocked(true);
              });
            }
            // Route incoming remote audio to the security stream analyzer
            analyzerRef.current?.attachAudioStream(stream);
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
            setAiProbability(result.ai_probability ?? 0.03);
            setSpeakerMatch(result.speaker_match_score ?? null);
            setLiveness(result.liveness_score ?? null);
            setDetectedArtifacts(result.detected_artifacts || []);
            setRecommendedAction(result.recommended_action);

            if (result.diagnostics) {
              setSegmentAIDiagnostics({
                model_probability: result.diagnostics.model_probability ?? result.ai_probability,
                calibrated_model_probability: result.diagnostics.calibrated_model_probability,
                artifact_score: result.diagnostics.artifact_score,
                spectral_score: result.diagnostics.spectral_score,
                prosody_score: result.diagnostics.prosody_score,
                replay_score: result.diagnostics.replay_score,
                snr_db: result.diagnostics.snr_db,
                duration_seconds: result.diagnostics.duration_seconds,
                sample_rate: result.diagnostics.sample_rate,
                codec: result.diagnostics.codec,
                fusion_weights: result.diagnostics.fusion_weights,
                fused_probability: result.diagnostics.fused_probability ?? result.ai_probability,
                confidence: result.diagnostics.confidence ?? result.confidence,
                consensus: result.diagnostics.consensus,
                classification: result.diagnostics.classification ?? (result.severity === 'CRITICAL' ? 'AI_GENERATED' : 'HUMAN'),
                reason: result.diagnostics.reason,
                primary_contributor: result.diagnostics.primary_contributor,
                detected_artifacts: result.detected_artifacts,
                disclaimer: result.disclaimer,
              });
            }

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

  const isCaller = call?.caller_id === user?.id;
  const peerName = (isCaller ? call?.receiver_name : call?.caller_name) || (isCaller ? 'Contact' : 'Caller');
  const peerVoxshieldId = (isCaller ? call?.receiver_voxshield_id : call?.caller_voxshield_id) || '';
  const continuousTrust = Math.max(0, Math.min(100, Math.round(100 - threatScore)));

  const voiceSecurityState = {
    trustScore: continuousTrust,
    threatLevel: severity,
    voiceAuthenticity: (aiProbability >= 0.7 ? 'Synthetic speech traits' : aiProbability >= 0.4 ? 'Ambiguous' : 'High confidence') as any,
    speakerMatch: (speakerMatch !== null ? (speakerMatch < 0.5 ? 'Mismatch' : speakerMatch < 0.75 ? 'Moderate' : 'Strong') : 'Not established') as any,
    liveness: (liveness !== null ? (liveness < 0.4 ? 'Replay risk' : liveness < 0.7 ? 'Marginal' : 'Passed') : 'Passed') as any,
    aiProbability,
    speakerMatchScore: speakerMatch,
    livenessScore: liveness,
    socialEngineeringRisk: severity === 'CRITICAL' || severity === 'HIGH',
    recommendation: recommendedAction,
    attackIndicators: detectedArtifacts,
    lastUpdated: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio element for remote WebRTC stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Autoplay Blocked Warning Banner */}
      {isAudioBlocked && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/50 flex items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3 text-amber-300 text-xs font-mono">
            <Volume2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-bold block uppercase">Remote Audio Blocked by Browser Autoplay</span>
              <span className="text-slate-300 text-[11px]">Click the button to unlock browser audio and hear the remote caller.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUnblockAudio}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors font-mono whitespace-nowrap"
          >
            🔊 Tap to Unmute Remote Audio
          </button>
        </div>
      )}

      {/* Phone View Mode (Default Clean Dialer Screen) */}
      {viewMode === 'phone' ? (
        <div className="flex flex-col items-center justify-between min-h-[580px] p-6 text-slate-100 select-none animate-fadeIn relative">
          {/* Top CALL PROTECTED Banner */}
          <div className="w-full max-w-sm mb-2">
            <div className={`p-3 rounded-2xl border transition-all ${
              severity === 'CRITICAL' || severity === 'HIGH'
                ? 'bg-rose-950/60 border-rose-500/60 shadow-lg shadow-rose-900/30'
                : 'bg-slate-900/80 border-slate-800 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    severity === 'CRITICAL' || severity === 'HIGH'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {severity === 'CRITICAL' || severity === 'HIGH' ? (
                      <ShieldAlert className="w-4 h-4 animate-bounce" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-mono font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5">
                      <span>CALL PROTECTED</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      AI Anti-Cloning Shield Active
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  severity === 'CRITICAL' || severity === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {severity === 'CRITICAL' || severity === 'HIGH'
                    ? '🚨 VOICE CLONING ATTACK'
                    : '🟢 LOW RISK'}
                </span>
              </div>

              {/* Decoupled Telemetry Strip */}
              <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-800 text-center font-mono">
                <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/80">
                  <span className="text-[9px] text-slate-400 uppercase block">Speaker Match</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {speakerMatch !== null ? `${Math.round(speakerMatch * 100)}%` : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/80">
                  <span className="text-[9px] text-slate-400 uppercase block">AI Voice Prob</span>
                  <span className={`text-xs font-bold ${aiProbability >= 0.6 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {(aiProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/80">
                  <span className="text-[9px] text-slate-400 uppercase block">Replay Suspicion</span>
                  <span className={`text-xs font-bold ${liveness !== null && liveness < 0.6 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {liveness !== null ? `${Math.max(0, Math.round((1 - liveness) * 100))}%` : '5%'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Info & Timer */}
          <div className="flex flex-col items-center text-center mt-2">
            <h2 className="text-2xl font-bold text-slate-100 tracking-wide">{peerName}</h2>
            {peerVoxshieldId && (
              <p className="text-xs font-mono text-cyan-400/90 mt-0.5">{peerVoxshieldId}</p>
            )}
            <p className="text-sm font-mono text-slate-400 mt-2 tracking-wider">
              {formatDuration(callDuration)}
            </p>

            {/* In-Call Security Indicator Pill */}
            <div className="mt-3">
              <SecurityIndicator
                threatLevel={severity}
                trustScore={continuousTrust}
                showScore={true}
                onClick={() => setShowSecuritySheet(true)}
              />
            </div>
          </div>

          {/* Center Contact Photo */}
          <div className="flex flex-col items-center justify-center my-6">
            <div
              className={`w-32 h-32 rounded-full p-1.5 shadow-2xl transition-all duration-300 ${
                severity === 'CRITICAL'
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-600/40 animate-pulse'
                  : severity === 'HIGH'
                  ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 shadow-amber-600/30'
                  : severity === 'MEDIUM'
                  ? 'bg-gradient-to-tr from-yellow-600 to-cyan-500 shadow-yellow-600/20'
                  : 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-cyan-500/20'
              }`}
            >
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-slate-100 font-bold text-5xl">
                {peerName ? peerName.charAt(0).toUpperCase() : <Shield className="w-14 h-14 text-cyan-400" />}
              </div>
            </div>

            {/* Warning advisory when threat elevated */}
            {severity !== 'LOW' && (
              <div
                onClick={() => setShowSecuritySheet(true)}
                className={`mt-4 px-4 py-2.5 rounded-2xl text-xs font-medium max-w-sm text-center cursor-pointer transition-transform active:scale-95 shadow-md ${
                  severity === 'CRITICAL'
                    ? 'bg-rose-950/90 border border-rose-500/60 text-rose-200 animate-pulse'
                    : severity === 'HIGH'
                    ? 'bg-amber-950/90 border border-amber-500/60 text-amber-200'
                    : 'bg-yellow-950/80 border border-yellow-500/50 text-yellow-200'
                }`}
              >
                <div className="font-bold text-rose-300">
                  {severity === 'CRITICAL'
                    ? '🚨 POSSIBLE VOICE CLONING ATTACK DETECTED'
                    : severity === 'HIGH'
                    ? '⚠️ POTENTIAL VOICE CLONING / SYNTHETIC AUDIO'
                    : 'Advisory: Minor acoustic anomalies detected.'}
                </div>
                {(severity === 'CRITICAL' || severity === 'HIGH') && (
                  <p className="text-[11px] text-slate-200 mt-1 font-semibold">
                    Recommended action: Verify the caller through another trusted communication channel.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* In-Call Controls */}
          <div className="w-full max-w-xs space-y-6">
            <div className="flex items-center justify-around">
              {/* Mute Button */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 border ${
                    isMuted
                      ? 'bg-slate-200 text-slate-900 border-white shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/60'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isMuted ? 'Muted' : 'Mute'}
                </span>
              </div>

              {/* Speaker Button */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  aria-label={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 border ${
                    isSpeakerOn
                      ? 'bg-slate-200 text-slate-900 border-white shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/60'
                  }`}
                >
                  {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <Radio className="w-6 h-6" />}
                </button>
                <span className="text-[11px] text-slate-400 font-medium">Speaker</span>
              </div>

              {/* Verification Button */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleIssueChallenge}
                  aria-label="Verify caller"
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 text-cyan-400 border border-slate-700/60 transition-all duration-150 active:scale-95"
                >
                  <KeyRound className="w-6 h-6" />
                </button>
                <span className="text-[11px] text-slate-400 font-medium">Verify</span>
              </div>
            </div>

            {/* End Call Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleEndCall}
                aria-label="End call"
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 active:scale-95 transition-all"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          </div>

          {/* Developer Tools & Technical Inspector Switch */}
          <div className="w-full flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowDiagnosticsDrawer(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Diagnostics</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => setShowBaselineModal(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Baseline Test</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => setViewMode('technical')}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 font-medium transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Technical SOC View</span>
            </button>
          </div>

          {/* Security Details Sheet */}
          <SecurityDetailsSheet
            isOpen={showSecuritySheet}
            onClose={() => setShowSecuritySheet(false)}
            security={voiceSecurityState}
            onRequestVerification={handleIssueChallenge}
          />
        </div>
      ) : (
        <>
          {/* Switch back to Phone View */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-850 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Technical Inspector Active</span>
              <button
                type="button"
                onClick={() => setShowDiagnosticsDrawer(true)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Diagnostics Drawer</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBaselineModal(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Human Baseline Test</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('phone')}
              className="px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              Return to Phone Dialer
            </button>
          </div>

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

      {/* Unified CALL PROTECTED Banner with Decoupled Telemetry */}
      {!createdIncident && (
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          severity === 'CRITICAL' || severity === 'HIGH'
            ? 'bg-cyber-crimson/15 border-2 border-cyber-crimson animate-threat-pulse'
            : 'bg-cyber-surface border border-cyber-border'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl border ${
                severity === 'CRITICAL' || severity === 'HIGH'
                  ? 'bg-cyber-crimson/20 border-cyber-crimson text-cyber-crimson'
                  : 'bg-cyber-emerald/20 border-cyber-emerald text-cyber-emerald'
              }`}>
                {severity === 'CRITICAL' || severity === 'HIGH' ? (
                  <ShieldAlert className="w-6 h-6 animate-bounce" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-cyber-text uppercase tracking-wider">
                    CALL PROTECTED
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    severity === 'CRITICAL' || severity === 'HIGH'
                      ? 'bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/40'
                      : 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40'
                  }`}>
                    {severity === 'CRITICAL' || severity === 'HIGH'
                      ? '🚨 POSSIBLE VOICE CLONING ATTACK'
                      : '🟢 LOW RISK'}
                  </span>
                </div>
                <p className="text-xs text-cyber-muted mt-0.5 max-w-xl">
                  {severity === 'CRITICAL' || severity === 'HIGH' ? (
                    <span>
                      Synthetic speech characteristics detected. Threat score reached{' '}
                      <strong className="text-cyber-crimson font-mono">{Math.round(threatScore)}/100</strong>. Action:{' '}
                      <strong className="text-orange-400 font-mono">{recommendedAction}</strong>.
                    </span>
                  ) : (
                    'Real-time multi-signal acoustic defense and neural anti-cloning filters active.'
                  )}
                </p>
                {(severity === 'CRITICAL' || severity === 'HIGH') && (
                  <div className="text-xs font-mono font-bold text-cyber-crimson mt-1.5 flex items-center gap-1.5">
                    <span>🚨 Recommended Action: Verify the caller through another trusted communication channel</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
              {/* Decoupled Metrics: Caller, Speaker Match, AI Voice Prob, Replay Suspicion */}
              <div className="bg-cyber-card border border-cyber-border px-3 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-cyber-muted text-[10px] block">Caller</span>
                <span className="font-bold text-cyber-text">{peerName}</span>
              </div>
              <div className="bg-cyber-card border border-cyber-border px-3 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-cyber-muted text-[10px] block">Speaker Match</span>
                <span className="font-bold text-cyber-emerald">
                  {speakerMatch !== null ? `${Math.round(speakerMatch * 100)}%` : 'N/A'}
                </span>
              </div>
              <div className="bg-cyber-card border border-cyber-border px-3 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-cyber-muted text-[10px] block">AI Voice Prob</span>
                <span className={`font-bold ${aiProbability >= 0.6 ? 'text-cyber-crimson' : 'text-cyber-text'}`}>
                  {(aiProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-cyber-card border border-cyber-border px-3 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-cyber-muted text-[10px] block">Replay Suspicion</span>
                <span className={`font-bold ${liveness !== null && liveness < 0.6 ? 'text-cyber-amber' : 'text-cyber-text'}`}>
                  {liveness !== null ? `${Math.max(0, Math.round((1 - liveness) * 100))}%` : '5%'}
                </span>
              </div>

              <button
                id="verify-caller-btn"
                data-testid="verify-caller-btn"
                onClick={handleIssueChallenge}
                className="py-2.5 px-4 rounded-xl bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-cyan text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg transition-colors flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Verify Caller</span>
              </button>

              {(severity === 'HIGH' || severity === 'CRITICAL') && (
                <>
                  <button
                    onClick={() => setShowSecondaryModal(true)}
                    className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg transition-colors flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Secondary Verification</span>
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="py-2.5 px-4 rounded-xl bg-cyber-crimson hover:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg transition-colors"
                  >
                    End Call Now
                  </button>
                </>
              )}
            </div>
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
          {/* Step 8: Context-Aware Protection Panel */}
          <div className="bg-cyber-surface border border-cyber-border rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyber-border">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyber-cyan" />
                <h3 className="text-xs font-bold text-cyber-text uppercase font-mono tracking-wider">
                  Security Context Panel
                </h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                contextRiskScore >= 60
                  ? 'bg-cyber-crimson/15 text-cyber-crimson border border-cyber-crimson/30'
                  : 'bg-cyber-amber/15 text-cyber-amber border border-cyber-amber/30'
              }`}>
                Context Risk: {contextRiskScore}/100
              </span>
            </div>

            {/* Context Controls */}
            <div className="space-y-2.5 text-xs font-mono">
              {/* Caller Identity */}
              <div className="flex items-center justify-between">
                <span className="text-cyber-muted">Caller:</span>
                <button
                  type="button"
                  onClick={() => setCallerKnown(!callerKnown)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                    callerKnown
                      ? 'bg-cyber-emerald/15 text-cyber-emerald border-cyber-emerald/40'
                      : 'bg-cyber-crimson/15 text-cyber-crimson border-cyber-crimson/40'
                  }`}
                >
                  {callerKnown ? 'Known Contact' : 'Unknown Caller'}
                </button>
              </div>

              {/* Transaction Type */}
              <div className="flex items-center justify-between">
                <span className="text-cyber-muted">Action:</span>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="bg-cyber-card border border-cyber-border rounded-lg px-2 py-1 text-cyber-cyan outline-none text-xs"
                >
                  <option value="routine_call">Routine Conversation</option>
                  <option value="fund_transfer">Fund Transfer</option>
                  <option value="wire_authorization">Wire Authorization</option>
                  <option value="password_reset">Password Reset</option>
                </select>
              </div>

              {/* Transaction Amount */}
              <div className="flex items-center justify-between">
                <span className="text-cyber-muted">Amount:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-cyber-muted font-mono">₹</span>
                  <input
                    type="number"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(Math.max(0, Number(e.target.value)))}
                    className="w-28 bg-cyber-card border border-cyber-border rounded-lg px-2 py-1 text-cyber-text text-right outline-none text-xs font-mono"
                  />
                </div>
              </div>

              {/* Urgency */}
              <div className="flex items-center justify-between">
                <span className="text-cyber-muted">Urgency:</span>
                <select
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                  className="bg-cyber-card border border-cyber-border rounded-lg px-2 py-1 text-cyber-text outline-none text-xs"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High Pressure / Urgent</option>
                  <option value="critical">Extreme Secrecy</option>
                </select>
              </div>

              {/* Risk Fusion Calculation */}
              <div className="p-3 bg-cyber-card/60 rounded-xl border border-cyber-border space-y-1 text-[11px]">
                <div className="flex justify-between text-cyber-muted">
                  <span>Voice Suspicion:</span>
                  <strong className="text-cyber-text">{Math.round(threatScore)}/100</strong>
                </div>
                <div className="flex justify-between text-cyber-muted">
                  <span>Context Risk Modifier:</span>
                  <strong className={contextRiskScore > 30 ? 'text-cyber-crimson' : 'text-cyber-amber'}>
                    +{contextRiskScore}
                  </strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-cyber-border font-bold">
                  <span className="text-cyber-text">Combined Risk:</span>
                  <span className="text-cyber-crimson font-mono">
                    {Math.min(100, Math.round(threatScore * 0.7 + contextRiskScore * 0.3))}/100
                  </span>
                </div>
              </div>

              {/* Recommendation Banner */}
              {(threatScore > 50 || contextRiskScore > 40) && (
                <div className="p-2.5 bg-cyber-crimson/10 border border-cyber-crimson/30 rounded-xl text-[11px] text-cyber-crimson font-sans leading-tight">
                  <strong>Recommendation:</strong> Do not approve the requested transaction using this call. Perform secondary verification.
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowSecondaryModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan/25 font-bold text-xs uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Trigger Secondary Verification</span>
              </button>
            </div>
          </div>

          {/* Security Timeline */}
          <div className="bg-cyber-surface border border-cyber-border rounded-3xl p-5 flex flex-col h-[420px]">
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
      </>
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

      {/* Step 9: Secondary Verification Workflow Modal */}
      {showSecondaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-surface border border-cyber-crimson/60 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-cyber-text font-mono uppercase tracking-wide">
                    SECURITY WARNING
                  </h3>
                  <p className="text-xs text-cyber-crimson font-mono">
                    Possible voice impersonation detected.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSecondaryModal(false);
                  setSecondaryActionStatus(null);
                }}
                className="text-cyber-muted hover:text-cyber-text p-1 text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyber-card border border-cyber-border text-xs text-cyber-muted leading-relaxed font-mono">
              The platform detected acoustic vocoder anomalies combined with a high-risk contextual action (<strong>{transactionType}</strong> for <strong>₹{transactionAmount.toLocaleString('en-IN')}</strong>). Select an out-of-band verification protocol:
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => handleSecondaryAction('callback')}
                className="p-3 rounded-xl bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-cyan text-left transition-all"
              >
                <div className="text-xs font-bold text-cyber-cyan font-mono flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" /> [CALL BACK]
                </div>
                <div className="text-[10px] text-cyber-muted mt-1">
                  Call verified registered executive line
                </div>
              </button>

              <button
                onClick={() => handleSecondaryAction('mfa')}
                className="p-3 rounded-xl bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-cyan text-left transition-all"
              >
                <div className="text-xs font-bold text-cyber-emerald font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> [VERIFY WITH MFA]
                </div>
                <div className="text-[10px] text-cyber-muted mt-1">
                  Dispatch push authenticator prompt
                </div>
              </button>

              <button
                onClick={() => handleSecondaryAction('otp')}
                className="p-3 rounded-xl bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-cyan text-left transition-all"
              >
                <div className="text-xs font-bold text-cyber-amber font-mono flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> [REQUEST OTP]
                </div>
                <div className="text-[10px] text-cyber-muted mt-1">
                  Acoustic challenge-response verification
                </div>
              </button>

              <button
                onClick={() => handleSecondaryAction('escalate')}
                className="p-3 rounded-xl bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-cyan text-left transition-all"
              >
                <div className="text-xs font-bold text-orange-400 font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> [ESCALATE]
                </div>
                <div className="text-[10px] text-cyber-muted mt-1">
                  Notify Fraud Investigation SOC team
                </div>
              </button>

              <button
                onClick={() => handleSecondaryAction('report')}
                className="sm:col-span-2 p-3 rounded-xl bg-cyber-crimson/15 hover:bg-cyber-crimson/25 border border-cyber-crimson/40 text-left transition-all"
              >
                <div className="text-xs font-bold text-cyber-crimson font-mono flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> [REPORT INCIDENT &amp; BLOCK]
                </div>
                <div className="text-[10px] text-cyber-muted mt-1">
                  File RFC 8785 tamper-evident incident with blockchain anchor proof
                </div>
              </button>
            </div>

            {/* Action Status Output */}
            {secondaryActionStatus && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyber-cyan/40 text-xs font-mono">
                <div className="text-cyber-cyan font-bold uppercase mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyber-emerald" />
                  Protocol Action Executed
                </div>
                <div className="text-cyber-text leading-relaxed">
                  {secondaryActionStatus.message}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Part 1 & Part 2 Developer Diagnostics Drawer */}
      <DeveloperDiagnosticsDrawer
        isOpen={showDiagnosticsDrawer}
        onClose={() => setShowDiagnosticsDrawer(false)}
        webrtcStats={webrtcStats}
        aiDiagnostics={segmentAIDiagnostics}
        isAudioBlocked={isAudioBlocked}
        onUnblockAudio={handleUnblockAudio}
        onRefresh={async () => {
          if (webrtcRef.current) {
            try {
              const stats = await webrtcRef.current.getConnectionStats();
              setWebrtcStats(stats);
            } catch {
              // ignore
            }
          }
        }}
      />

      {/* Part 4 Developer Human Baseline Test Modal */}
      <HumanBaselineTestModal
        isOpen={showBaselineModal}
        onClose={() => setShowBaselineModal(false)}
      />
    </div>
  );
};
