import React from 'react';
import { HardDrive } from 'lucide-react';

export default function Drive() {
  return (
    <div className="bx-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--bx-text-muted)' }}>
      <HardDrive size={64} style={{ marginBottom: '16px', opacity: 0.2 }} />
      <h2 style={{ color: 'var(--bx-text-main)', marginBottom: '8px' }}>Drive</h2>
      <p>Secure cloud file storage and version control goes here.</p>
    </div>
  );
}
