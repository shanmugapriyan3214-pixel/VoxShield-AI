import React, { useEffect, useRef } from 'react';

interface LiveWaveformProps {
  isActive?: boolean;
  status?: 'HUMAN' | 'AI_GENERATED' | 'UNCERTAIN' | 'IDLE';
  audioStream?: MediaStream | null;
  height?: number;
  className?: string;
}

export const LiveWaveform: React.FC<LiveWaveformProps> = ({
  isActive = true,
  status = 'IDLE',
  audioStream = null,
  height = 96,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Determine line and glow color based on classification status
  const getColor = () => {
    switch (status) {
      case 'AI_GENERATED':
        return { stroke: '#EF4444', glow: 'rgba(239, 68, 68, 0.45)', fill: 'rgba(239, 68, 68, 0.08)' };
      case 'UNCERTAIN':
        return { stroke: '#F59E0B', glow: 'rgba(245, 158, 11, 0.45)', fill: 'rgba(245, 158, 11, 0.08)' };
      case 'HUMAN':
        return { stroke: '#10B981', glow: 'rgba(16, 185, 129, 0.45)', fill: 'rgba(16, 185, 129, 0.08)' };
      default:
        return { stroke: '#0284C7', glow: 'rgba(2, 132, 199, 0.40)', fill: 'rgba(2, 132, 199, 0.06)' };
    }
  };

  useEffect(() => {
    if (!audioStream) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaStreamSource(audioStream);
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    } catch {
      // Fall back to synthetic organic wave
    }

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [audioStream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const colors = getColor();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = colors.stroke;
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = isActive ? 12 : 4;

      if (analyserRef.current && isActive) {
        analyserRef.current.getByteTimeDomainData(dataArray);
      }

      ctx.beginPath();
      const sliceWidth = width / 64;
      let x = 0;

      for (let i = 0; i < 64; i++) {
        let v = 0.5;
        if (analyserRef.current && isActive) {
          v = dataArray[i % bufferLength] / 128.0;
        } else if (isActive) {
          // Synthetic subtle natural speech modulation
          const harmonic1 = Math.sin(phase + i * 0.18) * 0.28;
          const harmonic2 = Math.cos(phase * 1.5 + i * 0.35) * 0.14;
          const dampening = Math.sin((i / 64) * Math.PI); // Pin edges to center
          v = 0.5 + (harmonic1 + harmonic2) * dampening;
        } else {
          // Flat baseline in idle
          v = 0.5 + Math.sin(phase * 0.5 + i * 0.1) * 0.03;
        }

        const y = v * h;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();

      // Soft gradient fill under wave
      ctx.lineTo(width, h);
      ctx.lineTo(0, h);
      ctx.fillStyle = colors.fill;
      ctx.fill();

      phase += 0.07;
      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isActive, status]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200/80 ${className}`}>
      <canvas
        ref={canvasRef}
        width={640}
        height={height}
        className="w-full h-full block"
      />
      <div className="absolute top-2.5 right-3 flex items-center space-x-1.5 pointer-events-none">
        <span
          className={`w-2 h-2 rounded-full ${
            isActive ? (status === 'AI_GENERATED' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse') : 'bg-slate-400'
          }`}
        />
        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
          {isActive ? 'LIVE AUDIO RADAR' : 'STANDBY'}
        </span>
      </div>
    </div>
  );
};
