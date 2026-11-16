const MIN_REFRESH_INTERVAL = 10_000;

export function startForegroundSync(refresh, { shouldRefresh = () => true } = {}) {
  let running = false;
  let lastStarted = -Infinity;

  async function sync() {
    const now = performance.now();
    if (running || document.hidden || !shouldRefresh() || now - lastStarted < MIN_REFRESH_INTERVAL) return;
    running = true;
    lastStarted = now;
    try {
      await refresh();
    } finally {
      running = false;
    }
  }

  document.addEventListener('visibilitychange', sync);
  for (const event of ['focus', 'pageshow', 'online', 'hashchange']) {
    window.addEventListener(event, sync);
  }
  sync();

  return () => {
    document.removeEventListener('visibilitychange', sync);
    for (const event of ['focus', 'pageshow', 'online', 'hashchange']) {
      window.removeEventListener(event, sync);
    }
  };
}
