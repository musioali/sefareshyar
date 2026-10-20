import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './kit';

/** Chrome on Android has BarcodeDetector; Safari on iPhone does not, so the button only shows where it works. */
export const canScan = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia);

const WANTED = ['code_128', 'code_39', 'codabar', 'itf', 'ean_13', 'qr_code', 'data_matrix'];

export function ScanSheet({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (digits: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;

    (async () => {
      try {
        const Detector = (window as any).BarcodeDetector;
        const supported: string[] = Detector.getSupportedFormats ? await Detector.getSupportedFormats() : [];
        const formats = supported.length ? WANTED.filter((f) => supported.includes(f)) : WANTED;
        const detector = new Detector({ formats });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            // a postal tracking code is a long run of digits
            const hit = codes.map((c: any) => String(c.rawValue || '').replace(/\D/g, '')).find((d: string) => d.length >= 10);
            if (hit) {
              onCode(hit);
              return;
            }
          } catch {
            /* a frame that could not be read; try the next one */
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch (e: any) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'اجازهٔ دوربین داده نشد. از تنظیمات مرورگر اجازه بدهید یا کد را تایپ کنید.'
            : 'دوربین باز نشد. کد را تایپ کنید.'
        );
      }
    })();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col animate-fade" role="dialog" aria-modal="true" aria-label="اسکن بارکد پستی">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 text-white">
        <p className="text-base font-bold">بارکد رسید پست را جلوی دوربین بگیرید</p>
        <IconButton label="بستن" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </IconButton>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-28 rounded-2xl ring-2 ring-white/80 shadow-[0_0_0_9999px_rgba(13,24,56,0.45)]"
        />
      </div>
      {error && <p className="px-4 py-3 text-sm text-white bg-rose-600">{error}</p>}
    </div>,
    document.body
  );
}
