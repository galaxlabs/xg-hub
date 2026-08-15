import { getBackendUrl } from '../api';

/** Selfie path from DB → full URL (works with /api proxy on VPS) */
export function getSelfieUrl(selfie?: string | null): string | null {
  if (!selfie || selfie === '-') return null;
  if (selfie.startsWith('http') || selfie.startsWith('data:')) return selfie;

  const base = getBackendUrl().replace(/\/$/, '');
  
  // Case: DB has /api/uploads/attendance/...
  if (selfie.startsWith('/api/uploads/')) {
    return `${base}${selfie}`;
  }
  
  // Case: DB has /uploads/attendance/...
  if (selfie.startsWith('/uploads/')) {
    return `${base}/api${selfie}`;
  }
  
  // Case: DB has api/uploads/...
  if (selfie.startsWith('api/')) {
    return `${base}/${selfie}`;
  }
  
  // Case: DB has just filename
  return `${base}/api/uploads/attendance/${selfie.replace(/^\//, '')}`;
}

/** Compress selfie before upload (nginx often blocks large POST bodies) */
export function compressSelfie(dataUrl: string, maxWidth = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
