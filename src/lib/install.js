let installPrompt = null;

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export async function promptInstall() {
  if (!installPrompt) return false;
  const prompt = installPrompt;
  installPrompt = null;
  try {
    await prompt.prompt();
    return true;
  } catch {
    return false;
  }
}

const standaloneDisplay = window.matchMedia('(display-mode: standalone)');
const updateDisplayMode = () => {
  document.documentElement.classList.toggle('standalone-mode', isStandalone());
};
updateDisplayMode();
standaloneDisplay.addEventListener?.('change', updateDisplayMode);

document.addEventListener('contextmenu', event => {
  if (event.pointerType !== 'touch' || !isStandalone()) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (event.target.closest('button, .profile-identity')) {
    event.preventDefault();
  }
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(error => console.warn('Babji tracker could not enable its offline screen.', error));
  });
}
