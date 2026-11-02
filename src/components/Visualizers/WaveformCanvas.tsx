import React, { useRef, useEffect } from 'react';
import { EarIsolation } from '../../types/audio';

interface WaveformCanvasProps {
  currentBeatHz: number;
  currentCarrierHz: number;
  isPlaying: boolean;
  earIsolation: EarIsolation;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  currentBeatHz,
  currentCarrierHz,
  isPlaying,
  earIsolation
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseAccumLRef = useRef(0);
  const phaseAccumRRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let animId: number;

    const render = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Advance phase
      const speedScale = isPlaying ? 1.0 : 0.15;
      phaseAccumLRef.current += dt * speedScale * (currentCarrierHz - currentBeatHz / 2) * 0.12;
      phaseAccumRRef.current += dt * speedScale * (currentCarrierHz + currentBeatHz / 2) * 0.12;

      const midY = h * 0.5;
      const amp = h * 0.22;

      // Left Ear Sine (Emerald)
      if (earIsolation !== 'left') {
        ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
          const t = (x / w) * Math.PI * 10;
          const y = midY + Math.sin(t + phaseAccumLRef.current) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }

      // Right Ear Sine (Amber)
      if (earIsolation !== 'right') {
        ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
          const t = (x / w) * Math.PI * 10;
          const y = midY + Math.sin(t * (1 + currentBeatHz / currentCarrierHz) + phaseAccumRRef.current) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }

      // Combined Binaural Interference Envelope (Sky Cyan)
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const t = (x / w) * Math.PI * 10;
        const sL = earIsolation === 'left' ? 0 : Math.sin(t + phaseAccumLRef.current);
        const sR = earIsolation === 'right' ? 0 : Math.sin(t * (1 + currentBeatHz / currentCarrierHz) + phaseAccumRRef.current);
        const sum = (sL + sR) * 0.5;
        const y = midY + sum * (amp * 1.45);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2 * dpr;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentBeatHz, currentCarrierHz, isPlaying, earIsolation]);

  return (
    <div className="md:col-span-2 h-40 bg-slate-950/90 rounded-xl border border-slate-800/90 overflow-hidden relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
        Time Domain Waveform Interference
      </div>
    </div>
  );
};
