import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleAlert } from 'lucide-react';

type Tone = 'ok' | 'error';
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((text: string, tone: Tone = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {createPortal(
        <div className="fixed top-3 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
          {items.map((t) => (
            <div
              key={t.id}
              className="animate-rise pointer-events-auto flex items-center gap-2.5 rounded-full bg-ink-900/90 backdrop-blur-md text-white pl-5 pr-2 py-2 shadow-[var(--shadow-lift)] text-sm font-semibold max-w-md"
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  t.tone === 'ok' ? 'bg-leaf-500' : 'bg-rose-500'
                }`}
              >
                {t.tone === 'ok' ? <Check className="w-4 h-4" /> : <CircleAlert className="w-4 h-4" />}
              </span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
