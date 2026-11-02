import React from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div
      onClick={onClose}
      className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl bg-slate-900/95 border border-sky-500/40 text-xs text-sky-200 shadow-2xl font-mono cursor-pointer transition transform animate-fade-in backdrop-blur-md flex items-center justify-between gap-3"
    >
      <span>{message}</span>
      <button className="text-slate-400 hover:text-white text-xs">✕</button>
    </div>
  );
};
