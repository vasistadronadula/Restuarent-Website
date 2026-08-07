'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Trigger smooth top accent progress bar animation on route change
    setProgress(35);
    const t1 = setTimeout(() => setProgress(75), 90);
    const t2 = setTimeout(() => setProgress(100), 220);
    const t3 = setTimeout(() => setProgress(0), 400);

    // Scroll to top smoothly on page transition
    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  return (
    <div key={pathname} className="w-full flex-1 animate-page-transition relative">
      {/* Top Page Route Transition Accent Progress Indicator */}
      {progress > 0 && (
        <div
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 z-[9999] transition-all duration-300 ease-out shadow-sm pointer-events-none"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
          }}
        />
      )}
      {children}
    </div>
  );
}
