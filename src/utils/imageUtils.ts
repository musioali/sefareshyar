/**
 * Image processing utilities:
 * - Client-side image compression (JPEG quality 0.7, max dimension 1600px)
 * - Resolution & common screenshot detection for soft warnings
 */

export interface ImageAnalysisResult {
  dataUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  isLikelyScreenshot: boolean;
  isLowQuality: boolean;
  warningReason?: string;
}

// Common mobile screenshot dimensions (portrait or landscape)
const COMMON_SCREENSHOT_RESOLUTIONS = [
  [1080, 2340],
  [1080, 2400],
  [1080, 1920],
  [1170, 2532],
  [1284, 2778],
  [1290, 2796],
  [1179, 2556],
  [750, 1334],
  [828, 1792],
  [1125, 2436],
  [1440, 3120],
  [1440, 3200],
];

function isMatchResolution(w: number, h: number): boolean {
  for (const [sw, sh] of COMMON_SCREENSHOT_RESOLUTIONS) {
    if ((w === sw && h === sh) || (w === sh && h === sw)) {
      return true;
    }
    // Also tolerance of 1-2px due to status bar differences
    if (Math.abs(w - sw) <= 4 && Math.abs(h - sh) <= 4) {
      return true;
    }
  }
  return false;
}

export function processAndCompressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.7
): Promise<ImageAnalysisResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('تصویر نامعتبر است'));
      img.onload = () => {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;
        const longEdge = Math.max(origWidth, origHeight);
        const originalBytes = file.size;

        const isLikelyScreenshot = isMatchResolution(origWidth, origHeight);
        const isLowRes = longEdge < 1600;
        const isLowSize = originalBytes < 300 * 1024; // < 300KB
        const isLowQuality = isLikelyScreenshot || isLowRes || isLowSize;

        let warningReason: string | undefined;
        if (isLikelyScreenshot) {
          warningReason = 'این تصویر مشابه اسکرین‌شات از موبایل است و ممکن است جزئیات کافی برای کار دستی نداشته باشد.';
        } else if (isLowRes || isLowSize) {
          warningReason = 'ابعاد یا کیفیت این عکس ممکن است برای کار دقیق مناسب نباشد. در صورت امکان فایل باکیفیت‌تر انتخاب کنید.';
        }

        // Calculate scaling
        let targetWidth = origWidth;
        let targetHeight = origHeight;
        if (longEdge > maxDimension) {
          const scale = maxDimension / longEdge;
          targetWidth = Math.round(origWidth * scale);
          targetHeight = Math.round(origHeight * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('مرورگر از پردازش عکس پشتیبانی نمی‌کند'));
          return;
        }

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);

        resolve({
          dataUrl: compressedDataUrl,
          width: targetWidth,
          height: targetHeight,
          originalBytes,
          compressedBytes: approxBytes,
          isLikelyScreenshot,
          isLowQuality,
          warningReason,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
