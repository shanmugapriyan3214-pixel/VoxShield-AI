import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileCode,
  Layers,
  Lock,
  Server,
  Terminal,
} from 'lucide-react';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  category: string;
  description: string;
  requestExample?: string;
  responseExample: string;
}

const endpoints: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/analysis/audio',
    category: 'Audio Analysis',
    description: 'Upload audio file (.wav, .mp3, .flac) for deepfake detection, vocoder artifact analysis, and authenticity scoring.',
    requestExample: `curl -X POST "http://localhost:8000/api/v1/analysis/audio?language=en-IN" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -F "file=@suspect_audio.wav"`,
    responseExample: `{
  "success": true,
  "data": {
    "analysis_id": "an_8f9c2d1b",
    "classification": "LIKELY_AI_GENERATED",
    "ai_probability": 0.96,
    "human_probability": 0.04,
    "synthetic_artifact_level": "HIGH",
    "detected_artifacts": ["vocoder_phase_discontinuity", "spectral_flux_anomaly"],
    "confidence_score": 0.95,
    "language": "en-IN",
    "model_version": "AASIST-L-v2.1"
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/calls/{call_id}/security-analysis',
    category: 'Real-Time Voice Telemetry',
    description: 'Submit client-side sliding-window telemetry for real-time threat fusion. (ZERO RAW AUDIO TRANSMITTED).',
    requestExample: `curl -X POST "http://localhost:8000/api/v1/calls/{call_id}/security-analysis" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ai_generated_probability": 0.91,
    "speaker_match_probability": 0.35,
    "liveness_probability": 0.28,
    "window_duration_ms": 1500,
    "detected_artifacts": ["vocoder_phase_discontinuity"],
    "transaction_type": "fund_transfer",
    "transaction_amount": 500000
  }'`,
    responseExample: `{
  "success": true,
  "data": {
    "threat_score": 88.5,
    "severity": "CRITICAL",
    "recommended_action": "RECOMMEND_TERMINATION",
    "recommendation": "CRITICAL THREAT: High-confidence voice clone impersonation attack.",
    "context_risk": 35.0,
    "social_engineering_risk": true
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/calls/{call_id}/security',
    category: 'Real-Time Voice Telemetry',
    description: 'Get latest real-time threat posture, encryption details, and total security events for active session.',
    responseExample: `{
  "success": true,
  "data": {
    "call_id": "call_12345",
    "status": "ACCEPTED",
    "encryption": "DTLS-SRTP-AES-128-GCM",
    "threat_score": 12.0,
    "severity": "LOW",
    "ai_probability": 0.04,
    "speaker_match_score": 0.94,
    "liveness_score": 0.95
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/trusted-voices',
    category: 'Trusted Voices & Biometrics',
    description: 'Register trusted contact metadata for biometric speaker verification.',
    requestExample: `curl -X POST "http://localhost:8000/api/v1/trusted-voices" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "display_name": "Chief Executive Officer",
    "phone_number": "+91 98765 43210",
    "relationship": "Executive Leadership"
  }'`,
    responseExample: `{
  "success": true,
  "data": {
    "id": "tv_99a8b7c6",
    "display_name": "Chief Executive Officer",
    "phone_number": "+91 98765 43210",
    "status": "ACTIVE"
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/calls/{call_id}/challenge',
    category: 'Secondary Verification',
    description: 'Issue interactive dynamic acoustic passphrase verification challenge for caller.',
    responseExample: `{
  "success": true,
  "data": {
    "challenge_id": "ch_77b6c5d4",
    "call_id": "call_12345",
    "passphrase": "ALPHA BRAVO DELTA RIVER",
    "prompt": "Please speak the phonetic passphrase: ALPHA BRAVO DELTA RIVER",
    "status": "ISSUED"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/threats',
    category: 'Threat Intelligence',
    description: 'List historical threat detection events with severity, date, and call filters.',
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "th_112233",
      "call_id": "call_12345",
      "event_type": "AI_VOICE_DETECTED",
      "severity": "HIGH",
      "threat_score": 78.4,
      "ai_probability": 0.88,
      "timestamp": "2026-09-10T12:30:00Z"
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/incidents',
    category: 'Incident Management',
    description: 'Create tamper-evident security incident record with RFC 8785 canonical hash.',
    responseExample: `{
  "success": true,
  "data": {
    "id": "inc_445566",
    "incident_number": "INC-2026-0042",
    "status": "OPEN",
    "canonical_hash": "a8f9c2d1b3e4...6f7a",
    "blockchain_anchored": true
  }
}`,
  },
];

export const ApiDocs: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Audio Analysis', 'Real-Time Voice Telemetry', 'Trusted Voices & Biometrics', 'Secondary Verification', 'Threat Intelligence', 'Incident Management'];

  const filteredEndpoints = filterCategory === 'ALL'
    ? endpoints
    : endpoints.filter((e) => e.category === filterCategory);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyber-cyan uppercase tracking-wider mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>VOXSHIELD DEVELOPER API &amp; INTEGRATION MATRIX</span>
            </div>
            <h2 className="text-2xl font-bold text-cyber-text tracking-wide">
              API DOCUMENTATION &amp; SPECIFICATIONS
            </h2>
            <p className="text-xs text-cyber-muted mt-1 max-w-xl">
              Integrate real-time voice cloning defense, zero-server-audio telemetry, and biometric speaker verification into telephony gateways, banking apps, and SOC systems.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3.5 rounded-xl bg-cyber-cyan text-cyber-bg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-cyan-glow hover:bg-cyan-300 transition-all"
            >
              <span>Swagger UI</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="http://localhost:8000/redoc"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3.5 rounded-xl bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border text-cyber-text font-mono text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span>ReDoc</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all ${
              filterCategory === cat
                ? 'bg-cyber-card border border-cyber-cyan/40 text-cyber-cyan shadow-cyan-glow'
                : 'text-cyber-muted hover:text-cyber-text bg-cyber-surface border border-cyber-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {filteredEndpoints.map((endpoint, i) => (
          <div
            key={i}
            className="bg-cyber-surface border border-cyber-border rounded-2xl p-5 hover:border-cyber-cyan/30 transition-all space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                    endpoint.method === 'GET'
                      ? 'bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30'
                      : endpoint.method === 'POST'
                      ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30'
                      : endpoint.method === 'PATCH'
                      ? 'bg-cyber-amber/15 text-cyber-amber border border-cyber-amber/30'
                      : 'bg-cyber-crimson/15 text-cyber-crimson border border-cyber-crimson/30'
                  }`}
                >
                  {endpoint.method}
                </span>
                <span className="text-sm font-mono font-semibold text-cyber-text">
                  {endpoint.path}
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyber-muted bg-cyber-card px-2.5 py-0.5 rounded-md border border-cyber-border">
                {endpoint.category}
              </span>
            </div>

            <p className="text-xs text-cyber-muted leading-relaxed">
              {endpoint.description}
            </p>

            {/* Request Sample if present */}
            {endpoint.requestExample && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-cyber-muted mb-1">
                  <span>cURL Request Example</span>
                  <button
                    onClick={() => handleCopy(endpoint.requestExample!, i * 2)}
                    className="flex items-center gap-1 text-cyber-cyan hover:underline"
                  >
                    {copiedIndex === i * 2 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === i * 2 ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl border border-cyber-border text-[11px] font-mono text-cyber-text overflow-x-auto">
                  {endpoint.requestExample}
                </pre>
              </div>
            )}

            {/* Response Sample */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-cyber-muted mb-1">
                <span>Response Schema Preview</span>
                <button
                  onClick={() => handleCopy(endpoint.responseExample, i * 2 + 1)}
                  className="flex items-center gap-1 text-cyber-cyan hover:underline"
                >
                  {copiedIndex === i * 2 + 1 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === i * 2 + 1 ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 rounded-xl border border-cyber-border text-[11px] font-mono text-cyber-emerald/90 overflow-x-auto">
                {endpoint.responseExample}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ApiDocs;
