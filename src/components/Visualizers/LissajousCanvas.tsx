import React, { useRef, useEffect } from 'react';
import { EarIsolation } from '../../types/audio';

interface LissajousCanvasProps {
  currentBeatHz: number;
  currentCarrierHz: number;
  isPlaying: boolean;
  earIsolation: EarIsolation;
}

export const LissajousCanvas: React.FC<LissajousCanvasProps> = ({
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

      const cx = w * 0.5;
      const cy = h * 0.5;
      const rad = Math.min(w, h) * 0.36;

      ctx.beginPath();
      for (let i = 0; i < 220; i++) {
        const t = (i / 220) * Math.PI * 4;
        const xVal = earIsolation === 'left' ? 0 : Math.sin(t + phaseAccumLRef.current);
        const yVal = earIsolation === 'right' ? 0 : Math.sin(t * (1 + currentBeatHz / Math.max(80, currentCarrierHz)) + phaseAccumRRef.current);
        const px = cx + xVal * rad;
        const py = cy + yVal * rad;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.8 * dpr;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentBeatHz, currentCarrierHz, isPlaying, earIsolation]);

  return (
    <div className="h-40 bg-slate-950/90 rounded-xl border border-slate-800/90 overflow-hidden relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
        X-Y Phase Lissajous
      </div>
    </div>
  );
};
