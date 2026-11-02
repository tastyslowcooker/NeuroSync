import React, { useRef, useEffect, useCallback } from 'react';
import { Stage } from '../../types/preset';

interface TimelineCanvasProps {
  stages: Stage[];
  elapsedSec: number;
  totalSec: number;
  currentBeatHz: number;
  currentCarrierHz: number;
  onScrub: (sec: number) => void;
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  stages,
  elapsedSec,
  totalSec,
  currentBeatHz,
  currentCarrierHz,
  onScrub
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  const handlePointerEvent = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || totalSec <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onScrub(relX * totalSec);
  }, [totalSec, onScrub]);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    handlePointerEvent(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    if (e.touches[0]) {
      handlePointerEvent(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) handlePointerEvent(e.clientX);
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches[0]) {
        handlePointerEvent(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handlePointerEvent]);

  // Render loop on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padTop = 26 * dpr;
    const padBottom = 26 * dpr;
    const plotH = Math.max(10, h - padTop - padBottom);
    const maxFreq = 26; // Scale for Delta..Beta

    const yForHz = (hz: number) => {
      const norm = Math.max(0, Math.min(1, hz / maxFreq));
      return padTop + plotH * (1 - norm);
    };

    let minCarrier = 90;
    let maxCarrier = 220;
    stages.forEach(s => {
      minCarrier = Math.min(minCarrier, s.startCarrier - 15, s.endCarrier - 15);
      maxCarrier = Math.max(maxCarrier, s.startCarrier + 15, s.endCarrier + 15);
    });
    const carrierSpan = Math.max(40, maxCarrier - minCarrier);
    const yForCarrierHz = (cHz: number) => {
      const norm = Math.max(0, Math.min(1, (cHz - minCarrier) / carrierSpan));
      return padTop + plotH * (1 - norm);
    };

    // Reference bands
    const bands = [
      { label: 'DELTA (<4Hz)', hz: 4 },
      { label: 'THETA (4-8Hz)', hz: 8 },
      { label: 'ALPHA (8-13Hz)', hz: 13 },
      { label: 'BETA (13-26Hz)', hz: 26 }
    ];

    ctx.font = `${10 * dpr}px "JetBrains Mono", monospace`;
    bands.forEach(b => {
      const y = yForHz(b.hz);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.fillText(b.label, 8 * dpr, y + 12 * dpr);
    });

    if (totalSec <= 0 || stages.length === 0) return;

    // Fill gradient under Beat curve
    const grad = ctx.createLinearGradient(0, padTop, 0, h - padBottom);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    ctx.beginPath();
    ctx.moveTo(0, h - padBottom);

    let accumSec = 0;
    stages.forEach((stage, idx) => {
      const stageSec = Math.max(0.5, stage.durationMin) * 60;
      const xStart = (accumSec / totalSec) * w;
      const xEnd = ((accumSec + stageSec) / totalSec) * w;
      const yStart = yForHz(stage.startBeat);
      const yEnd = yForHz(stage.endBeat);

      if (idx === 0) ctx.lineTo(xStart, yStart);
      ctx.lineTo(xEnd, yEnd);
      accumSec += stageSec;
    });

    ctx.lineTo(w, h - padBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Carrier Frequency Dashed Curve
    accumSec = 0;
    ctx.save();
    ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    stages.forEach((stage, idx) => {
      const stageSec = Math.max(0.5, stage.durationMin) * 60;
      const xStart = (accumSec / totalSec) * w;
      const xEnd = ((accumSec + stageSec) / totalSec) * w;
      const yStart = yForCarrierHz(stage.startCarrier);
      const yEnd = yForCarrierHz(stage.endCarrier);

      if (idx === 0) ctx.moveTo(xStart, yStart);
      else ctx.lineTo(xStart, yStart);
      ctx.lineTo(xEnd, yEnd);
      accumSec += stageSec;
    });
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.75)';
    ctx.lineWidth = 1.8 * dpr;
    ctx.stroke();
    ctx.restore();

    // Primary Beat Frequency Curve
    accumSec = 0;
    ctx.beginPath();
    stages.forEach((stage, idx) => {
      const stageSec = Math.max(0.5, stage.durationMin) * 60;
      const xStart = (accumSec / totalSec) * w;
      const xEnd = ((accumSec + stageSec) / totalSec) * w;
      const yStart = yForHz(stage.startBeat);
      const yEnd = yForHz(stage.endBeat);

      if (idx === 0) ctx.moveTo(xStart, yStart);
      else ctx.lineTo(xStart, yStart);
      ctx.lineTo(xEnd, yEnd);
      accumSec += stageSec;
    });
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.4 * dpr;
    ctx.stroke();

    // Stage Dividers & Labels
    accumSec = 0;
    stages.forEach((stage, idx) => {
      const stageSec = Math.max(0.5, stage.durationMin) * 60;
      const xStart = (accumSec / totalSec) * w;
      if (idx > 0) {
        ctx.save();
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.beginPath();
        ctx.moveTo(xStart, padTop);
        ctx.lineTo(xStart, h - padBottom);
        ctx.stroke();
        ctx.restore();
      }

      if ((stageSec / totalSec) * w > 50 * dpr) {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.65)';
        ctx.fillText(stage.label.substring(0, 14), xStart + 6 * dpr, h - 8 * dpr);
      }
      accumSec += stageSec;
    });

    // Playhead Scrubber
    const playheadX = Math.max(0, Math.min(w, (elapsedSec / totalSec) * w));
    const currentY = yForHz(currentBeatHz);
    const currentCarrierY = yForCarrierHz(currentCarrierHz);

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();

    // Carrier node
    ctx.fillStyle = '#818cf8';
    ctx.beginPath();
    ctx.arc(playheadX, currentCarrierY, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    // Beat node
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(playheadX, currentY, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // Readout Pill
    const pillText = `${currentBeatHz.toFixed(1)}Hz Beat | ${currentCarrierHz.toFixed(1)}Hz Carrier`;
    ctx.font = `600 ${10 * dpr}px "JetBrains Mono", monospace`;
    const textW = ctx.measureText(pillText).width + 14 * dpr;
    const pillX = Math.min(w - textW - 6 * dpr, Math.max(6 * dpr, playheadX - textW / 2));
    const pillY = 4 * dpr;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, textW, 18 * dpr, 4 * dpr);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(pillText, pillX + 7 * dpr, pillY + 12 * dpr);
  }, [stages, elapsedSec, totalSec, currentBeatHz, currentCarrierHz]);

  return (
    <div className="relative w-full h-48 sm:h-56 bg-slate-950/90 rounded-xl border border-slate-800/90 overflow-hidden cursor-ew-resize">
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="w-full h-full block"
      />
    </div>
  );
};
