const LAST_USED_KEY = 'little-days.auth-last-used';
const INACTIVITY_LIMIT = 7 * 24 * 60 * 60 * 1000;
const WRITE_INTERVAL = 60 * 1000;

export function rememberDeviceUse() {
  localStorage.setItem(LAST_USED_KEY, String(Date.now()));
}

export function observeDeviceSession(auth, onSession) {
  let currentSession = null;
  let signingOut = false;
  let expiryTask;

  function checkActivity(recordUse = false) {
    if (!currentSession || signingOut) return;
    const lastUsed = Number(localStorage.getItem(LAST_USED_KEY));
    const elapsed = Date.now() - lastUsed;
    if (lastUsed && elapsed > INACTIVITY_LIMIT) {
      signingOut = true;
      currentSession = null;
      onSession(null);
      // Auth event callbacks can hold the SDK lock, so sign out in a separate task.
      expiryTask = window.setTimeout(async () => {
        try {
          await auth.signOut({ scope: 'local' });
        } catch (error) {
          console.warn('Could not end the inactive Babji tracker session.', error);
        } finally {
          signingOut = false;
        }
      }, 0);
      return;
    }
    if (recordUse && (!lastUsed || elapsed >= WRITE_INTERVAL)) rememberDeviceUse();
  }

  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') localStorage.removeItem(LAST_USED_KEY);
    if (signingOut) return;
    currentSession = session;
    checkActivity(event === 'INITIAL_SESSION' && !document.hidden);
    if (!signingOut) onSession(currentSession);
  });

  const onInteraction = () => checkActivity(true);
  const onVisible = () => {
    if (!document.hidden) onInteraction();
  };
  const expiryInterval = window.setInterval(() => checkActivity(), WRITE_INTERVAL);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pointerdown', onInteraction);
  window.addEventListener('keydown', onInteraction);
  window.addEventListener('pageshow', onVisible);
  return () => {
    subscription.unsubscribe();
    window.clearTimeout(expiryTask);
    window.clearInterval(expiryInterval);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pointerdown', onInteraction);
    window.removeEventListener('keydown', onInteraction);
    window.removeEventListener('pageshow', onVisible);
  };
}
