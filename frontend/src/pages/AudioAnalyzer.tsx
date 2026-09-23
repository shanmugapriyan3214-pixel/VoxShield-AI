import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { AudioAnalysisResponse } from '../types/analysis';
import { useToast } from '../components/common/Toast';
import {
  VoiceAuthenticityResultCard,
  VoiceAuthenticityStatus,
  SecurityRiskLevel,
  TechnicalForensicData,
} from '../components/security/VoiceAuthenticityResultCard';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FileAudio,
  HelpCircle,
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  Shield,
  Square,
  Upload,
  Volume2,
  Waves,
  X,
} from 'lucide-react';

/**
 * Encode an AudioBuffer into standard 16-bit PCM WAV format.
 * Prevents container/codec mismatches (e.g. browser WebM labeled as .wav).
 */
function encodeWavBuffer(audioBuffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const channelData = audioBuffer.getChannelData(0);
  const dataLength = channelData.length * (bitDepth / 8);
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const AudioAnalyzer: React.FC = () => {
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AudioAnalysisResponse | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [audioUrl]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAudioFile(file);
    }
  };

  const processAudioFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['wav', 'mp3', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
      showToast('Please upload a WAV, MP3, OGG, FLAC, or M4A audio file.', 'error');
      return;
    }
    setSelectedFile(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setResult(null);
  };

  // Drag and drop handling
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAudioFile(file);
    }
  };

  // Start microphone recording
  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const rawBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          const arrayBuffer = await rawBlob.arrayBuffer();
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const wavBlob = encodeWavBuffer(audioBuffer);
          const file = new File([wavBlob], `mic-sample-${Date.now()}.wav`, { type: 'audio/wav' });

          setSelectedFile(file);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(wavBlob));
          await audioCtx.close();
        } catch (e: any) {
          // Fallback if Web Audio decoding fails
          const fallbackBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const file = new File([fallbackBlob], `mic-sample-${Date.now()}.wav`, { type: 'audio/wav' });
          setSelectedFile(file);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(fallbackBlob));
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setMicError(
        'Microphone access was denied or is unavailable. In your browser address bar, click the lock/settings icon to enable microphone permissions.'
      );
      showToast('Microphone access denied. Please check browser permissions.', 'error');
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Submit audio file to backend
  const runAnalysis = async (demoScenarioOverride?: string) => {
    if (!selectedFile && !demoScenarioOverride) {
      showToast('Please upload or record an audio file first.', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        // Minimal RIFF WAV header for preset simulation if no file uploaded
        const dummyWav = new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x2c, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
          0x66, 0x6d, 0x74, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
          0x80, 0x3e, 0x00, 0x00, 0x00, 0x7d, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00,
          0x64, 0x61, 0x74, 0x61, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00
        ]);
        const blob = new Blob([dummyWav], { type: 'audio/wav' });
        formData.append('file', blob, 'preset-sample.wav');
      }

      let url = `/analysis/audio?language=${selectedLanguage}`;
      if (demoScenarioOverride) {
        url += `&demo_scenario=${demoScenarioOverride}`;
      }

      const response = await api.postFormData<AudioAnalysisResponse>(url, formData);
      setResult(response);
      showToast('Voice authenticity analysis complete.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Analysis failed. Please check file format.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  // Load preset demo audio
  const loadPreset = (scenario: 'voice_clone' | 'suspicious' | 'normal') => {
    const names = {
      voice_clone: 'Synthetic-Clone-Voice-Sample.wav',
      suspicious: 'Loudspeaker-Replay-Sample.wav',
      normal: 'Authentic-Human-Voice.wav',
    };
    setSelectedFile(new File([new Uint8Array(200)], names[scenario], { type: 'audio/wav' }));
    runAnalysis(scenario);
  };

  // Compute Voice Authenticity Status
  const getAuthenticityStatus = (): VoiceAuthenticityStatus => {
    if (analyzing) return 'ANALYZING';
    if (!result) return 'NO_ANALYSIS';
    const c = result.classification;
    if (c === 'AI_GENERATED' || c === 'LIKELY_AI_GENERATED') return 'HIGH_RISK';
    if (c === 'SUSPICIOUS' || c === 'UNCERTAIN') return 'SUSPICIOUS';
    if (c === 'HUMAN' || c === 'LIKELY_HUMAN') return 'SAFE';
    return result.ai_probability >= 0.65 ? 'HIGH_RISK' : result.ai_probability >= 0.35 ? 'SUSPICIOUS' : 'SAFE';
  };

  const getRiskLevel = (): SecurityRiskLevel => {
    if (!result) return 'LOW';
    if (result.ai_probability >= 0.70) return 'HIGH';
    if (result.ai_probability >= 0.40) return 'MODERATE';
    return 'LOW';
  };

  const getReasons = (): string[] => {
    if (!result) return [];
    const reasons: string[] = [];
    if (result.signals?.spectral === 'HIGH' || result.ai_probability >= 0.6) {
      reasons.push('Acoustic spectral profile shows synthetic vocoder envelope characteristics');
    } else {
      reasons.push('Acoustic spectral profile displays natural biological formant transitions');
    }

    if (result.signals?.prosody === 'ANOMALOUS' || (result.prosody_anomaly_score && result.prosody_anomaly_score > 0.4)) {
      reasons.push('Unnatural pitch regularity and prosodic cadence detected');
    } else {
      reasons.push('Natural human prosodic cadence and pitch modulation observed');
    }

    if (result.detected_artifacts && result.detected_artifacts.length > 0) {
      reasons.push(`Detected acoustic indicators: ${result.detected_artifacts.map((a) => a.replace(/_/g, ' ')).join(', ')}`);
    }

    if (result.replay_suspicion && result.replay_suspicion > 0.35) {
      reasons.push('Acoustic markers indicate potential loudspeaker or room replay');
    }

    return reasons;
  };

  const getAction = (): string => {
    const status = getAuthenticityStatus();
    switch (status) {
      case 'HIGH_RISK':
        return 'Verify caller using another trusted method before sharing sensitive information, credentials, or initiating fund transfers.';
      case 'SUSPICIOUS':
        return 'Exercise heightened caution. Verify identity with a secondary channel before proceeding.';
      case 'SAFE':
        return 'Voice characteristics appear authentic and human. Standard security guidelines apply.';
      default:
        return 'Upload an audio file or record from microphone to evaluate voice authenticity.';
    }
  };

  const technicalData: TechnicalForensicData | undefined = result
    ? {
        aiProbability: result.ai_probability,
        humanProbability: result.human_probability,
        speakerMatch: result.speaker_match_score,
        livenessScore: result.liveness_score,
        snrDb: result.diagnostics?.snr_db,
        spectralStatus: result.signals?.spectral,
        prosodyStatus: result.signals?.prosody,
        detectedArtifacts: result.detected_artifacts,
        modelConsensus: result.diagnostics?.model_consensus,
        dynamicWeights: result.diagnostics?.weights_applied as Record<string, number> | undefined,
        rawScores: result.diagnostics?.raw_scores as Record<string, number> | undefined,
      }
    : undefined;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[11px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
            <span>VOICE SECURITY &amp; FORENSICS</span>
            <span>•</span>
            <span className="text-cyan-600 font-bold">MULTI-SIGNAL ENGINE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mic className="w-6 h-6 text-cyan-600" />
            Voice Authenticity Analyzer
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Analyze recorded audio or capture live speech to assess synthetic voice cloning, vocoder artifacts, and prosodic cadence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Language / Acoustic Context Selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono">
            <span className="text-slate-500 font-medium">Acoustic Model:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer"
            >
              <option value="en-IN">en-IN (Indian English)</option>
              <option value="hi-IN">hi-IN (Hindi)</option>
              <option value="ta-IN">ta-IN (Tamil)</option>
              <option value="te-IN">te-IN (Telugu)</option>
              <option value="ml-IN">ml-IN (Malayalam)</option>
              <option value="kn-IN">kn-IN (Kannada)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Microphone Permission Warning if denied */}
      {micError && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-start justify-between gap-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Microphone Access Required</div>
              <p className="mt-0.5 text-amber-800 leading-relaxed text-[11px]">{micError}</p>
            </div>
          </div>
          <button
            onClick={() => setMicError(null)}
            className="p-1 rounded-lg text-amber-600 hover:text-amber-900 hover:bg-amber-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input, Recorder & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Audio Upload Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all bg-white shadow-soft ${
              selectedFile
                ? 'border-cyan-500/80 bg-cyan-50/20'
                : 'border-slate-200 hover:border-cyan-500/50 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".wav,.mp3,.ogg,.flac,.m4a,audio/*"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2.5">
              <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100 shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Upload voice sample or drag & drop'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 font-mono">
                  WAV, MP3, FLAC, OGG, M4A (Max 25MB)
                </div>
              </div>
            </div>
          </div>

          {/* Microphone Capture Box */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-slate-500 uppercase font-semibold flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-600" />
                <span>Microphone Capture</span>
              </div>
              {isRecording && (
                <span className="text-xs font-mono text-rose-600 font-bold flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  REC {recordingDuration}s
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 transition"
                >
                  <Mic className="w-4 h-4 text-cyan-600" />
                  <span>Record Voice Sample</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition animate-pulse shadow-sm"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Recording</span>
                </button>
              )}
            </div>
          </div>

          {/* Audio Playback Preview */}
          {audioUrl && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-soft space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 font-semibold">
                <span>Selected Audio Preview</span>
                <Volume2 className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <audio controls src={audioUrl} className="w-full h-9 rounded-lg" />
            </div>
          )}

          {/* Analyze Button */}
          <button
            type="button"
            disabled={(!selectedFile && !audioUrl) || analyzing}
            onClick={() => runAnalysis()}
            className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Authenticity Analysis...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Analyze Voice Authenticity</span>
              </>
            )}
          </button>

          {/* Demonstration Presets */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-soft">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-600" />
              <span>Demo Scenario Presets (Quick Evaluation)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <button
                type="button"
                onClick={() => loadPreset('normal')}
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-[11px] font-mono font-semibold text-emerald-700 transition"
              >
                Human Voice
              </button>
              <button
                type="button"
                onClick={() => loadPreset('suspicious')}
                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-[11px] font-mono font-semibold text-amber-700 transition"
              >
                Replay Attack
              </button>
              <button
                type="button"
                onClick={() => loadPreset('voice_clone')}
                className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100/70 border border-rose-200 text-[11px] font-mono font-semibold text-rose-700 transition"
              >
                AI Clone
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Standardized Forensic Result (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <VoiceAuthenticityResultCard
            status={getAuthenticityStatus()}
            riskLevel={getRiskLevel()}
            confidenceScore={result ? Math.round((result.confidence_score || 0.92) * 100) : undefined}
            reasons={getReasons()}
            recommendedAction={getAction()}
            technicalDetails={technicalData}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioAnalyzer;
