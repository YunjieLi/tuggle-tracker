import React, { useEffect, useState } from 'react';

const CHECK_INTERVAL = 5 * 60 * 1000;

export function ReleaseNotice() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const currentVersion = document.querySelector('meta[name="app-release"]')?.content;
    if (!currentVersion) return undefined;

    const controller = new AbortController();
    let checking = false;
    async function checkForUpdate() {
      if (document.hidden || checking) return;
      checking = true;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}version.json`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const { version } = await response.json();
        if (typeof version === 'string' && version && !controller.signal.aborted) {
          setAvailable(version !== currentVersion);
        }
      } catch {
        // A failed check is expected when offline. Try again on the next check.
      } finally {
        checking = false;
      }
    }

    const timer = window.setInterval(checkForUpdate, CHECK_INTERVAL);
    document.addEventListener('visibilitychange', checkForUpdate);
    window.addEventListener('pageshow', checkForUpdate);
    window.addEventListener('online', checkForUpdate);
    void checkForUpdate();
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', checkForUpdate);
      window.removeEventListener('pageshow', checkForUpdate);
      window.removeEventListener('online', checkForUpdate);
    };
  }, []);

  if (!available) return null;
  const english = localStorage.getItem('little-days.language.v1') === 'en';
  return <aside className="release-notice">
    <span role="status">{english ? 'A new version is available.' : '有新版本可用。'}</span>
    <button type="button" onClick={() => window.location.reload()}>
      {english ? 'Update now' : '立即更新'}
    </button>
  </aside>;
}
