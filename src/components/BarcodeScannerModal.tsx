import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Check, AlertCircle, Scan } from 'lucide-react';
import { isValidPostTrackingCode, toPersianDigits } from '../utils/persianUtils';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      if (!isOpen) return;
      setCameraError('');
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
          activeStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
          setIsScanning(true);
        } else {
          setCameraError('دسترسی به دوربین در این مرورگر پشتیبانی نمی‌شود.');
        }
      } catch (err: any) {
        setCameraError('اجازه دسترسی به دوربین داده نشد یا دستگاه دوربین ندارد.');
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  // BarcodeDetector interval if supported
  useEffect(() => {
    if (!isOpen || !isScanning || !videoRef.current) return;

    let intervalId: any;
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'itf'],
        });

        intervalId = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue.replace(/\D/g, '');
                if (rawValue.length >= 10) {
                  onScanSuccess(rawValue);
                  onClose();
                }
              }
            } catch {
              // ignore frame detection error
            }
          }
        }, 500);
      } catch {
        // BarcodeDetector failed to init
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, isScanning, onScanSuccess, onClose]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.replace(/\D/g, '');
    if (clean.length > 0) {
      onScanSuccess(clean);
      onClose();
    }
  };

  const handleSimulateQuickScan = () => {
    // Generate sample valid 20-digit barcode for testing
    const sample = '12345678901234567890';
    onScanSuccess(sample);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-2xl flex flex-col space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
            <Scan className="w-4 h-4 text-amber-600" />
            <span>اسکن بارکد ۲۰ رقمی قبض پست</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative w-full h-56 bg-black rounded-xl overflow-hidden flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-center text-stone-400 text-xs space-y-2">
              <Camera className="w-8 h-8 mx-auto text-stone-500" />
              <p>{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Laser Line Overlay */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
              <div className="absolute inset-8 border-2 border-dashed border-amber-400/80 rounded-lg pointer-events-none" />
            </>
          )}
        </div>

        <p className="text-[11px] text-stone-500 text-center leading-relaxed">
          بارکد چاپی روی رسید یا برچسب مرسوله پست را روبروی خط قرمز دوربین نگه دارید.
        </p>

        {/* Fast sample test button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSimulateQuickScan}
            className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors"
          >
            + درج نمونه بارکد ۲۰ رقمی پست (تست سریع)
          </button>
        </div>
      </div>
    </div>
  );
};
