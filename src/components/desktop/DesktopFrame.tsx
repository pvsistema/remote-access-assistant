import { useEffect, useState } from 'react';
import TitleBar from '@/components/desktop/TitleBar';
import { isDesktop } from '@/lib/desktop';

// Wraps the whole app. Inside the desktop host it adds a custom title bar
// and makes the content fill the remaining height. In the browser it just
// renders children unchanged.
const DesktopFrame = ({ children }: { children: React.ReactNode }) => {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    // The host injects the flag before the document loads; check on mount
    // and once more on next tick to be safe.
    const apply = () => {
      const d = isDesktop();
      setDesktop(d);
      document.documentElement.classList.toggle('is-desktop', d);
    };
    apply();
    const t = setTimeout(apply, 60);
    return () => clearTimeout(t);
  }, []);

  if (!desktop) return <>{children}</>;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
};

export default DesktopFrame;