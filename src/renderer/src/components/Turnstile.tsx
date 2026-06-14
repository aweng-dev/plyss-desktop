import React, { useEffect, useRef } from 'react';
import { TURNSTILE_SITEKEY } from '../lib/turnstile';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) return resolve();
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      // In case it already loaded before this listener attached.
      if (window.turnstile) resolve();
      return;
    }
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.addEventListener('load', () => resolve(), { once: true });
    document.head.appendChild(s);
  });
}

/**
 * Renders a Turnstile widget and reports its token. Renders nothing (and never
 * blocks) when no site key is configured, so login still works pre-provisioning.
 */
const Turnstile: React.FC<{ onToken: (token: string | null) => void }> = ({ onToken }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITEKEY) return;
    let cancelled = false;

    void loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITEKEY,
        callback: (token: string) => onToken(token),
        'error-callback': () => onToken(null),
        'expired-callback': () => onToken(null),
        theme: 'auto',
      });
    });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* already gone */ }
      }
    };
  }, [onToken]);

  if (!TURNSTILE_SITEKEY) return null;
  return <div ref={ref} className="mt-2" />;
};

export default Turnstile;
