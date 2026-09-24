import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Baby, Check, Droplets, Milk, Moon, Sparkles, Waves } from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { activityFromRow, activityToRow, getSignedInUsername, isSupabaseConfigured, sendPasswordReset, signInWithUsername, signUpWithUsername, supabase, updatePassword } from './lib/supabase';
import './styles.css';

const STORAGE_KEY = 'little-days.activities.v1';
const kinds = {
  feed: { label: 'Feed', past: 'Fed', icon: Milk, tint: 'lavender', note: 'Feeding' },
  pump: { label: 'Pump', past: 'Pumped', icon: Waves, tint: 'blue', note: 'Pumping' },
  diaper: { label: 'Diaper', past: 'Changed diaper', icon: Droplets, tint: 'peach', note: 'Diapers' },
  sleep: { label: 'Sleep', past: 'Sleep', icon: Moon, tint: 'sage', note: 'Sleep' },
};
const ago = (mins) => new Date(Date.now() - mins * 60_000).toISOString();
const initialActivities = [
  { id: 'sample-1', kind: 'feed', at: ago(34), detail: 'Feed', formulaAmount: 60, breastmilkAmount: 30, breastfeeding: true },
  { id: 'sample-2', kind: 'diaper', at: ago(92), detail: 'Wet diaper', amount: '' },
  { id: 'sample-3', kind: 'sleep', at: ago(158), detail: 'Nap', amount: '1 hr 12 min' },
  { id: 'sample-4', kind: 'pump', at: ago(241), detail: 'Pumping session', amount: 120 },
];
function getSavedActivities() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialActivities; }
  catch { return initialActivities; }
}

function getStoredActivities(key = STORAGE_KEY) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function ActivityIcon({ kind, size = 19 }) {
  const Icon = kinds[kind].icon;
  return <span className={`activity-icon ${kinds[kind].tint}`}><Icon size={size} strokeWidth={1.8} /></span>;
}

function timeAgo(date) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getTimeSlot(date = new Date()) {
  const rounded = new Date(date);
  rounded.setMinutes(Math.floor(rounded.getMinutes() / 10) * 10, 0, 0);
  return `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
}

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function activityDateAtTime(dateValue, value) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date.toISOString();
}

function AmountStepper({ label, value, onChange }) {
  const numericValue = value === '' ? null : Number(value);
  return <div className="amount-field">
    <span className="amount-label">{label}</span>
    <div className="amount-stepper">
      <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={numericValue === null || numericValue <= 0} onClick={() => onChange(String(Math.max(0, (numericValue || 0) - 5)))}>−</button>
      <input type="number" min="0" step="5" inputMode="numeric" readOnly aria-label={`${label} in milliliters`} value={value} placeholder="0" />
      <span className="amount-unit">ml</span>
      <button type="button" aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(String((numericValue || 0) + 5))}>+</button>
    </div>
  </div>;
}

function ActivityDialog({ kind, activity, open, onOpenChange, onSave, onDelete, lastFeed }) {
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');
  const [amounts, setAmounts] = useState({ formulaAmount: '', breastmilkAmount: '' });
  const [breastfeeding, setBreastfeeding] = useState(false);
  const [time, setTime] = useState(() => getTimeSlot());
  const [date, setDate] = useState(() => localDateValue());
  const [error, setError] = useState('');
  const config = kind ? kinds[kind] : null;
  useEffect(() => {
    if (!open) return;
    setTime(activity ? getTimeSlot(new Date(activity.at)) : getTimeSlot());
    setDate(activity ? localDateValue(new Date(activity.at)) : localDateValue());
    setError('');
    setDetail(kind === 'diaper' ? (activity?.detail?.startsWith('Wet') ? 'Wet' : activity?.detail?.startsWith('Poop') ? 'Poop' : activity?.detail === 'Both' ? 'Both' : '') : (activity?.detail ?? ''));
    setAmount(activity?.amount == null ? '' : String(activity.amount));
    if (kind === 'feed') {
      setBreastfeeding(Boolean(activity?.breastfeeding ?? lastFeed?.breastfeeding));
      setAmounts({
        formulaAmount: (activity?.formulaAmount ?? lastFeed?.formulaAmount) == null ? '' : String(activity?.formulaAmount ?? lastFeed?.formulaAmount),
        breastmilkAmount: (activity?.breastmilkAmount ?? lastFeed?.breastmilkAmount) == null ? '' : String(activity?.breastmilkAmount ?? lastFeed?.breastmilkAmount),
      });
    }
  }, [open, kind, activity, lastFeed]);
  const at = activityDateAtTime(date, time);
  const submit = (event) => {
    event.preventDefault();
    if (kind === 'feed') {
      const parsed = Object.fromEntries(Object.entries(amounts).map(([key, value]) => [key, value === '' ? null : Number(value)]));
      if (!Object.values(parsed).some(value => value !== null && value > 0)) {
        setError('Add at least one amount to save this feed.');
        return;
      }
      onSave({ id: activity?.id, kind, at, detail: 'Feed', breastfeeding, ...parsed });
    } else if (kind === 'pump') {
      onSave({ id: activity?.id, kind, at, detail: 'Pumping session', amount: amount === '' ? null : Number(amount) });
    } else if (kind === 'diaper') {
      onSave({ id: activity?.id, kind, at, detail: detail || 'Wet' });
    } else if (kind === 'sleep') {
      onSave({ id: activity?.id, kind, at, detail: detail.trim() || 'Sleep', amount: amount.trim() });
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    {config && <DialogContent className="activity-sheet-content">
      <DialogHeader>
        <ActivityIcon kind={kind} size={20} />
        <DialogTitle>{activity ? 'Edit' : 'Log'} {config.label.toLowerCase()}</DialogTitle>
      </DialogHeader>
      <form className="activity-form" onSubmit={submit}>
        <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
        <label>Time<input type="time" step="600" value={time} onChange={e => setTime(e.target.value)} required /></label>
        {kind === 'feed' && <div className="feed-amounts">
          <AmountStepper label="Formula" value={amounts.formulaAmount} onChange={value => setAmounts(current => ({ ...current, formulaAmount: value }))} />
          <AmountStepper label="Breastmilk" value={amounts.breastmilkAmount} onChange={value => setAmounts(current => ({ ...current, breastmilkAmount: value }))} />
          <button type="button" role="switch" aria-checked={breastfeeding} className={`breastfeeding-toggle ${breastfeeding ? 'on' : ''}`} onClick={() => setBreastfeeding(value => !value)}><span>Breastfeeding</span><span className="toggle-track"><span /></span></button>
          {error && <span className="form-error" role="alert">{error}</span>}
        </div>}
        {kind === 'pump' && <AmountStepper label="Amount" value={amount} onChange={setAmount} />}
        {kind === 'diaper' && <div className="diaper-segment" role="group" aria-label="Diaper type">
          {['Wet', 'Poop', 'Both'].map(option => <button key={option} type="button" aria-pressed={detail === option} className={detail === option ? 'selected' : ''} onClick={() => setDetail(option)}>{option}</button>)}
        </div>}
        {kind === 'sleep' && <>
          <label>Sleep note <span className="optional">optional</span><input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Nap, bedtime…" /></label>
          <label>Duration <span className="optional">optional</span><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 45 min" /></label>
        </>}
        <DialogFooter>{activity && <Button type="button" variant="outline" className="delete-record" onClick={() => onDelete(activity.id)}>Delete</Button>}<div className="dialog-actions"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">{activity ? 'Save' : 'Save'} {config.label.toLowerCase()}</Button></div></DialogFooter>
      </form>
    </DialogContent>}
  </Dialog>;
}

function defaultDetail(kind) {
  return { feed: 'Nursed', pump: 'Pumping session', diaper: 'Diaper changed', sleep: 'Sleep' }[kind];
}

function activitySubtitle(activity) {
  if (activity.kind === 'feed') {
    return [
      activity.formulaAmount != null && `Formula ${activity.formulaAmount} ml`,
      activity.breastmilkAmount != null && `Breastmilk ${activity.breastmilkAmount} ml`,
    ].filter(Boolean).join(' · ');
  }
  if (activity.kind === 'pump') return activity.amount != null ? `${activity.amount} ml` : 'Pumping session';
  return activity.detail + (activity.amount ? ` · ${activity.amount}` : '');
}

function AuthPanel({ recoveryMode, onPasswordUpdated }) {
  const [mode, setMode] = useState(recoveryMode ? 'new-password' : 'sign-in');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (recoveryMode) setMode('new-password');
  }, [recoveryMode]);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signInWithUsername(username.trim(), password);
      } else if (mode === 'sign-up') {
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        await signUpWithUsername(username.trim(), email.trim(), password);
      } else if (mode === 'reset') {
        await sendPasswordReset(username.trim());
        setMessage('If that user ID exists, reset instructions were sent.');
      } else {
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        const { error: updateError } = await updatePassword(password);
        if (updateError) throw updateError;
        setMessage('Password updated.');
        onPasswordUpdated();
      }
    } catch (authError) {
      setError(authError.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const heading = {
    'sign-in': 'Sign in',
    'sign-up': 'Create account',
    reset: 'Reset password',
    'new-password': 'Choose a new password',
  }[mode];
  const backToSignIn = async () => {
    if (mode === 'new-password') await supabase.auth.signOut();
    onPasswordUpdated();
    setMode('sign-in');
    setError('');
    setMessage('');
  };

  return <div className="auth-page"><section className="auth-panel">
    <span className="brand-mark"><Baby size={22} /></span>
    <h1>little days</h1>
    {mode === 'sign-in' || mode === 'sign-up' ? <div className="auth-modes" role="tablist" aria-label="Account access">
      <button type="button" role="tab" aria-selected={mode === 'sign-in'} className={mode === 'sign-in' ? 'active' : ''} onClick={() => { setMode('sign-in'); setError(''); setMessage(''); }}>Sign in</button>
      <button type="button" role="tab" aria-selected={mode === 'sign-up'} className={mode === 'sign-up' ? 'active' : ''} onClick={() => { setMode('sign-up'); setError(''); setMessage(''); }}>Create account</button>
    </div> : <h2>{heading}</h2>}
    <form className="auth-form" onSubmit={submit}>
      {mode !== 'new-password' && <label>User ID<input value={username} onChange={event => setUsername(event.target.value.toLowerCase())} autoComplete="username" minLength={3} maxLength={32} required /></label>}
      {mode === 'sign-up' && <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>}
      {mode !== 'reset' && <label>{mode === 'new-password' ? 'New password' : 'Password'}<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required /></label>}
      {(mode === 'sign-up' || mode === 'new-password') && <label>Confirm password<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required /></label>}
      <Button type="submit" disabled={busy}>{busy ? 'Please wait…' : heading}</Button>
    </form>
    {mode === 'sign-in' && <button className="auth-link" type="button" onClick={() => { setMode('reset'); setError(''); setMessage(''); }}>Forgot password?</button>}
    {(mode === 'reset' || mode === 'new-password') && <button className="auth-link" type="button" onClick={backToSignIn}>Back to sign in</button>}
    {message && <p className="auth-message" role="status">{message}</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
  </section></div>;
}

function App() {
  const [activities, setActivities] = useState(getSavedActivities);
  const [user, setUser] = useState(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [activeKind, setActiveKind] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [toast, setToast] = useState('');
  const accountMenuRef = useRef(null);
  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const closeOnOutsideClick = event => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen]);
  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setToast(error.message);
      setUser(data?.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT') setRecoveryMode(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!supabase || !user) return undefined;
    let active = true;
    setActivities([]);
    const loadActivities = async () => {
      const { data, error } = await supabase
        .from('baby_activities')
        .select('*')
        .order('occurred_at', { ascending: false });
      if (!active) return;
      if (error) {
        setActivities(getStoredActivities(`${STORAGE_KEY}.${user.id}`));
        setToast(`Could not load activities: ${error.message}`);
        return;
      }
      if (data.length) {
        const loaded = data.map(activityFromRow);
        setActivities(loaded);
        localStorage.setItem(`${STORAGE_KEY}.${user.id}`, JSON.stringify(loaded));
        return;
      }
      const legacy = getStoredActivities();
      if (!legacy.length) {
        setActivities([]);
        localStorage.setItem(`${STORAGE_KEY}.${user.id}`, '[]');
        return;
      }
      const migrated = legacy.map(item => ({
        ...item,
        id: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item.id) ? item.id : crypto.randomUUID(),
      }));
      const { error: migrationError } = await supabase
        .from('baby_activities')
        .upsert(migrated.map(item => activityToRow(item, user.id)));
      if (!active) return;
      if (migrationError) {
        setActivities(legacy);
        setToast(`Could not sync saved activities: ${migrationError.message}`);
        return;
      }
      setActivities(migrated);
      localStorage.setItem(`${STORAGE_KEY}.${user.id}`, JSON.stringify(migrated));
    };
    loadActivities();
    return () => { active = false; };
  }, [user]);
  useEffect(() => {
    if (!supabase || !user) {
      setAccountUsername('');
      return undefined;
    }
    let active = true;
    getSignedInUsername()
      .then(username => { if (active) setAccountUsername(username || ''); })
      .catch(error => { if (active) setToast(`Could not load user ID: ${error.message}`); });
    return () => { active = false; };
  }, [user]);
  const lastFeed = useMemo(() => activities.filter(item => item.kind === 'feed').sort((a, b) => new Date(b.at) - new Date(a.at))[0], [activities]);
  const visibleActivities = useMemo(() => [...activities].sort((a, b) => new Date(b.at) - new Date(a.at)), [activities]);
  const recent = visibleActivities;
  const logActivity = async (activity) => {
    const saved = { ...activity, id: activity.id || crypto.randomUUID() };
    const next = activity.id
      ? activities.map(item => item.id === activity.id ? saved : item)
      : [saved, ...activities];
    setActivities(next);
    localStorage.setItem(user ? `${STORAGE_KEY}.${user.id}` : STORAGE_KEY, JSON.stringify(next));
    if (supabase && user) {
      const { error } = await supabase.from('baby_activities').upsert(activityToRow(saved, user.id));
      if (error) {
        setToast(`Save failed: ${error.message}`);
        return;
      }
    }
    setActiveKind(null);
    setEditingActivity(null);
    setToast(`${kinds[activity.kind].label} ${activity.id ? 'updated' : 'logged'}`);
    window.setTimeout(() => setToast(''), 2200);
  };
  const removeActivity = async (id) => {
    const next = activities.filter(item => item.id !== id);
    setActivities(next);
    localStorage.setItem(user ? `${STORAGE_KEY}.${user.id}` : STORAGE_KEY, JSON.stringify(next));
    if (supabase && user) {
      const { error } = await supabase.from('baby_activities').delete().eq('id', id);
      if (error) {
        setToast(`Delete failed: ${error.message}`);
        return;
      }
    }
    setEditingActivity(null);
  };

  if (isSupabaseConfigured && authLoading) return <div className="auth-page"><div className="auth-panel">Loading…</div></div>;
  if (isSupabaseConfigured && (!user || recoveryMode)) return <AuthPanel recoveryMode={recoveryMode} onPasswordUpdated={() => setRecoveryMode(false)} />;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Little Days home"><span className="brand-mark"><Baby size={19} /></span><span>little days</span></a>
      {user ? <div className="account-menu" ref={accountMenuRef}>
        <button type="button" className="account-trigger" aria-label="Account menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(open => !open)}>
          <span className="baby-avatar">{(accountUsername || user.user_metadata?.username || '?').slice(0, 1).toUpperCase()}</span>
        </button>
        {accountMenuOpen && <div className="account-dropdown" role="group" aria-label="Account menu">
          <span className="account-username">{accountUsername || user.user_metadata?.username || '…'}</span>
          <button type="button" onClick={() => { setAccountMenuOpen(false); supabase.auth.signOut(); }}>Sign out</button>
        </div>}
      </div> : null}
    </header>
    <main id="top" className="page-wrap">
      <section className="quick-section" aria-labelledby="quick-heading">
        <div className="section-heading"><h2 id="quick-heading">Quick actions</h2></div>
        <div className="quick-grid">
          {Object.entries(kinds).map(([kind, item]) => {
            const Icon = item.icon;
            return <Button key={kind} variant="outline" className={`quick-action ${item.tint}`} onClick={() => setActiveKind(kind)}>
              <span className="quick-icon"><Icon size={21} strokeWidth={1.8}/></span><span className="quick-label">{item.label}</span>
            </Button>;
          })}
        </div>
      </section>

      <section className="quick-section recent-section" aria-labelledby="recent-heading">
        <div className="section-heading"><h2 id="recent-heading">Recent activity</h2></div>
        <div className="activity-list">
            {recent.map((activity, index) => {
              const item = kinds[activity.kind];
              return <article className="activity-row" key={activity.id} role="button" tabIndex={0} onClick={() => setEditingActivity(activity)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEditingActivity(activity); } }}>
                <ActivityIcon kind={activity.kind} />
                {index < recent.length - 1 && <span className="timeline-line"/>}
                <div className="activity-copy"><div className="activity-title"><strong>{item.past}</strong><span className="activity-time">{timeAgo(activity.at)}</span></div><div className="activity-detail">{activitySubtitle(activity)}</div></div>
              </article>;
            })}
            {recent.length === 0 && <div className="empty-feed"><span className="empty-icon"><Sparkles size={19}/></span><strong>No activity yet</strong><Button variant="outline" size="sm" onClick={() => setActiveKind('feed')}>Log</Button></div>}
        </div>
      </section>
    </main>
    <ActivityDialog kind={activeKind || editingActivity?.kind} activity={editingActivity} open={Boolean(activeKind || editingActivity)} lastFeed={lastFeed} onOpenChange={(open) => { if (!open) { setActiveKind(null); setEditingActivity(null); } }} onSave={logActivity} onDelete={removeActivity}/>
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
