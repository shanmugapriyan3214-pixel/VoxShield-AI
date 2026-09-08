import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DemoBannerProps {
  scenario?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ scenario }) => {
  return (
    <div className="w-full bg-amber-500/10 border-y border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-amber-400 text-xs font-mono">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-400" />
        <span className="font-bold tracking-wider">DEMO MODE — SIMULATED RESULT</span>
        <span className="hidden sm:inline text-amber-400/80">
          | Running scenario: <strong className="uppercase font-semibold">{scenario || 'Active Demo'}</strong>
        </span>
      </div>
      <span className="text-[11px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
        SANDBOX EVALUATION
      </span>
    </div>
  );
};
