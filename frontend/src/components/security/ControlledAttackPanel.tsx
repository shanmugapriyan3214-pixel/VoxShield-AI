import React, { useState } from 'react';
import { api } from '../../api/client';
import {
  AlertOctagon,
  AlertTriangle,
  Cpu,
  Flame,
  KeyRound,
  Play,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  Zap,
} from 'lucide-react';

export type DemoScenarioKey = 'NORMAL' | 'REPLAY_ATTACK' | 'SYNTHETIC_SPOOF' | 'SIMULATED_CRITICAL';

interface ControlledAttackPanelProps {
  currentScenario: DemoScenarioKey;
  onScenarioChange: (scenario: DemoScenarioKey) => void;
  onExecuteStep: (stepIndex: number, simulateChallengeFail?: boolean, overrideScenario?: DemoScenarioKey) => Promise<void>;
  onReset: () => Promise<void>;
  executing: boolean;
  isRealInference: boolean;
  provenanceLabel: string;
}

export const ControlledAttackPanel: React.FC<ControlledAttackPanelProps> = ({
  currentScenario,
  onScenarioChange,
  onExecuteStep,
  onReset,
  executing,
  isRealInference,
  provenanceLabel,
}) => {
  const [autoEscalating, setAutoEscalating] = useState(false);

  const handleRunFullAttack = async () => {
    setAutoEscalating(true);
    try {
      const scenarioToUse = currentScenario === 'NORMAL' ? 'SIMULATED_CRITICAL' : currentScenario;
      if (currentScenario === 'NORMAL') {
        onScenarioChange('SIMULATED_CRITICAL');
      }

      // Step 0: Baseline
      await onExecuteStep(0, false, scenarioToUse);
      await new Promise((r) => setTimeout(r, 1200));

      // Step 1: Advisory
      await onExecuteStep(1, false, scenarioToUse);
      await new Promise((r) => setTimeout(r, 1200));

      // Step 2: High Threat / Challenge Requirement
      await onExecuteStep(2, false, scenarioToUse);
      await new Promise((r) => setTimeout(r, 1200));

      // Step 3: Critical Impersonation Attack & Automatic Incident Creation
      await onExecuteStep(3, false, scenarioToUse);
    } finally {
      setAutoEscalating(false);
    }
  };

  return (
    <div className="bg-cyber-surface border border-cyber-border rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5">
      {/* Ambient header glow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-cyber-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyber-cyan uppercase font-bold tracking-widest">
              CONTROLLED CYBERSECURITY DEMONSTRATION
            </div>
            <h3 className="text-sm font-bold text-cyber-text tracking-wide font-mono">
              ATTACK SIMULATION CONTROLLER
            </h3>
          </div>
        </div>

        {/* Provenance Badge */}
        <div
          className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-2 self-start sm:self-center ${
            isRealInference
              ? 'bg-cyber-cyan/15 border-cyber-cyan/40 text-cyber-cyan'
              : 'bg-cyber-amber/15 border-cyber-amber/40 text-cyber-amber'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{provenanceLabel}</span>
        </div>
      </div>

      {/* Scenario Selection Controls */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-cyber-muted uppercase tracking-wider flex items-center justify-between">
          <span>1. Select Attack Vector / Test Mode:</span>
          <span className="text-[10px] text-cyber-muted">No Real Voice Clones Generated</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <button
            onClick={() => onScenarioChange('NORMAL')}
            disabled={executing || autoEscalating}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentScenario === 'NORMAL'
                ? 'bg-cyber-emerald/20 border-cyber-emerald text-cyber-emerald font-bold shadow-lg'
                : 'bg-cyber-card border-cyber-border text-cyber-muted hover:text-cyber-text'
            }`}
          >
            <div className="font-bold">Normal Call</div>
            <div className="text-[10px] opacity-80 mt-0.5">Real AASIST + ECAPA</div>
          </button>

          <button
            onClick={() => onScenarioChange('REPLAY_ATTACK')}
            disabled={executing || autoEscalating}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentScenario === 'REPLAY_ATTACK'
                ? 'bg-cyber-amber/20 border-cyber-amber text-cyber-amber font-bold shadow-lg'
                : 'bg-cyber-card border-cyber-border text-cyber-muted hover:text-cyber-text'
            }`}
          >
            <div className="font-bold">Replay Attack</div>
            <div className="text-[10px] opacity-80 mt-0.5">Acoustic Room Impulse</div>
          </button>

          <button
            onClick={() => onScenarioChange('SYNTHETIC_SPOOF')}
            disabled={executing || autoEscalating}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentScenario === 'SYNTHETIC_SPOOF'
                ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold shadow-lg'
                : 'bg-cyber-card border-cyber-border text-cyber-muted hover:text-cyber-text'
            }`}
          >
            <div className="font-bold">Synthetic Spoof</div>
            <div className="text-[10px] opacity-80 mt-0.5">Vocoder Artifacts</div>
          </button>

          <button
            onClick={() => onScenarioChange('SIMULATED_CRITICAL')}
            disabled={executing || autoEscalating}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentScenario === 'SIMULATED_CRITICAL'
                ? 'bg-cyber-crimson/25 border-cyber-crimson text-cyber-crimson font-bold shadow-crimson-glow'
                : 'bg-cyber-card border-cyber-border text-cyber-muted hover:text-cyber-text'
            }`}
          >
            <div className="font-bold">Simulated Critical</div>
            <div className="text-[10px] opacity-80 mt-0.5">Telemetry Demo</div>
          </button>
        </div>
      </div>

      {/* Demo Action Buttons */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-mono text-cyber-muted uppercase tracking-wider">
          2. Execute Attack Escalation & Defense Verification:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <button
            onClick={handleRunFullAttack}
            disabled={executing || autoEscalating}
            className="py-3 px-4 rounded-2xl bg-cyber-cyan hover:bg-cyan-300 text-cyber-bg font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-cyan-glow transition-all disabled:opacity-50"
          >
            <Flame className="w-4 h-4" />
            <span>{autoEscalating ? 'Escalating Attack...' : 'Run Attack Sequence'}</span>
          </button>

          <button
            onClick={() => onExecuteStep(2, true)}
            disabled={executing || autoEscalating}
            className="py-3 px-4 rounded-2xl bg-cyber-card border border-cyber-border hover:border-orange-500 text-orange-400 font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>Fail Challenge</span>
          </button>

          <button
            onClick={onReset}
            disabled={executing || autoEscalating}
            className="py-3 px-4 rounded-2xl bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-cyber-muted hover:text-cyber-text font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${executing ? 'animate-spin' : ''}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
