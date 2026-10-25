import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Baby, Check, ChevronRight, Droplets, Milk, Moon, Pencil, Settings, Sparkles, Waves } from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { activityFromRow, activityToRow, getSignedInUsername, isSupabaseConfigured, signInWithUsername, supabase } from './lib/supabase';
import './styles.css';

const STORAGE_KEY = 'little-days.activities.v1';
const QUICK_ACTIONS_KEY = 'little-days.quick-actions.v1';
const LANGUAGE_KEY = 'little-days.language.v1';
const PROFILE_PICTURES_BUCKET = 'profile-pictures';
const DEFAULT_QUICK_ACTIONS = ['feed', 'diaper'];
const translations = {
  en: { feed: 'Feed', pump: 'Pump', diaper: 'Diaper', sleep: 'Sleep', fed: 'Fed', pumped: 'Pumped', changedDiaper: 'Changed diaper', edit: 'Edit', log: 'Log', time: 'Time', date: 'Date', accountMenu: 'Account menu', settings: 'Settings', profilePicture: 'Change profile picture', dragToCrop: 'Drag to position, then adjust the zoom.', zoom: 'Zoom', usePhoto: 'Use photo', home: 'Little Days home', formula: 'Formula', breastmilk: 'Breastmilk', breastfeeding: 'Breastfeeding', amount: 'Amount', wet: 'Wet', poop: 'Poop', duration: 'Duration', note: 'Note', addNote: 'Add a note…', autoSaveHint: 'Changes save automatically', cancel: 'Cancel', save: 'Save', delete: 'Delete', customize: 'Quick actions', language: 'Language', english: 'English', chinese: '中文', signOut: 'Sign out', quickActions: 'Quick actions', recentActivity: 'Recent activity', noActivity: 'No activity yet', justNow: 'Just now', minAgo: 'min ago', hrAgo: 'hr ago', hrsAgo: 'hrs ago', ml: 'ml', decrease: 'Decrease', increase: 'Increase', amountInMl: 'in milliliters', sleepDurationPlaceholder: 'e.g. 45 min', addFeedAmount: 'Add at least one amount to save this feed.', loading: 'Loading…', signIn: 'Sign in', name: 'Name', password: 'Password', wait: 'Please wait…', saveFailed: 'Save failed', deleteFailed: 'Delete failed', loadActivitiesFailed: 'Could not load activities', loadNameFailed: 'Could not load account name', updated: 'updated', logged: 'logged' },
  zh: { feed: '喂奶', pump: '泵奶', diaper: '尿布', sleep: '睡觉', edit: '编辑', log: '记录', time: '时间', date: '日期', accountMenu: '账户菜单', settings: '设置', profilePicture: '更换头像', dragToCrop: '拖动图片调整位置，再调整缩放。', zoom: '缩放', usePhoto: '使用头像', home: 'Little Days 首页', formula: '配方奶', breastmilk: '母乳', breastfeeding: '亲喂', amount: '奶量', wet: '尿湿', poop: '便便', duration: '时长', note: '备注', addNote: '添加备注…', autoSaveHint: '修改会自动保存', cancel: '取消', save: '保存', delete: '删除', customize: '快捷操作', language: '语言', english: 'English', chinese: '中文', signOut: '退出登录', quickActions: '快捷操作', recentActivity: '最近记录', noActivity: '暂无记录', justNow: '刚刚', minAgo: '分钟前', hrAgo: '小时前', hrsAgo: '小时前', ml: '毫升', decrease: '减少', increase: '增加', amountInMl: '单位：毫升', sleepDurationPlaceholder: '例如：45 分钟', addFeedAmount: '请填写至少一种奶量。', loading: '正在加载…', signIn: '登录', name: '姓名', password: '密码', wait: '请稍候…', saveFailed: '保存失败', deleteFailed: '删除失败', loadActivitiesFailed: '无法加载记录', loadNameFailed: '无法加载账户名称', updated: '已更新', logged: '已记录' },
};
const tr = (language, key) => translations[language]?.[key] ?? translations.en[key] ?? key;
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

function getQuickActions() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_ACTIONS_KEY));
    return Array.isArray(saved) ? saved.filter(kind => Object.hasOwn(kinds, kind)) : DEFAULT_QUICK_ACTIONS;
  } catch {
    return DEFAULT_QUICK_ACTIONS;
  }
}

function ActivityIcon({ kind, size = 19 }) {
  const Icon = kinds[kind].icon;
  return <span className={`activity-icon ${kinds[kind].tint}`}><Icon size={size} strokeWidth={1.8} /></span>;
}

function timeAgo(date, language) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return tr(language, 'justNow');
  if (minutes < 60) return `${minutes} ${tr(language, 'minAgo')}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${tr(language, hours > 1 ? 'hrsAgo' : 'hrAgo')}`;
  return new Date(date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en', { month: 'short', day: 'numeric' });
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

function AmountStepper({ label, value, onChange, language }) {
  const numericValue = value === '' ? null : Number(value);
  return <div className="amount-field">
    <span className="amount-label">{label}</span>
    <div className="amount-stepper">
      <button type="button" aria-label={`${tr(language, 'decrease')} ${label.toLowerCase()}`} disabled={numericValue === null || numericValue <= 0} onClick={() => onChange(String(Math.max(0, (numericValue || 0) - 5)))}>−</button>
      <input type="number" min="0" step="5" inputMode="numeric" readOnly aria-label={`${label} ${tr(language, 'amountInMl')}`} value={value} placeholder="0" />
      <span className="amount-unit">{tr(language, 'ml')}</span>
      <button type="button" aria-label={`${tr(language, 'increase')} ${label.toLowerCase()}`} onClick={() => onChange(String((numericValue || 0) + 5))}>+</button>
    </div>
  </div>;
}

function EventToggle({ label, checked, onChange }) {
  return <button type="button" role="switch" aria-checked={checked} className={`event-toggle ${checked ? 'on' : ''}`} onClick={onChange}>
    <span>{label}</span><span className="toggle-track"><span /></span>
  </button>;
}

function ProfilePictureCropDialog({ open, source, language, onOpenChange, onSave }) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const stageSize = 240;
  const fitScale = imageSize.width && imageSize.height ? Math.max(stageSize / imageSize.width, stageSize / imageSize.height) : 1;
  const imageWidth = imageSize.width * fitScale * zoom;
  const imageHeight = imageSize.height * fitScale * zoom;
  const clampOffset = (point, scale = zoom) => {
    const width = imageSize.width * fitScale * scale;
    const height = imageSize.height * fitScale * scale;
    return {
      x: Math.max(-(width - stageSize) / 2, Math.min((width - stageSize) / 2, point.x)),
      y: Math.max(-(height - stageSize) / 2, Math.min((height - stageSize) / 2, point.y)),
    };
  };
  useEffect(() => {
    if (!open) return;
    setImageSize({ width: 0, height: 0 });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [open, source]);
  const handlePointerDown = event => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offset };
  };
  const handlePointerMove = event => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset(clampOffset({ x: drag.offset.x + event.clientX - drag.x, y: drag.offset.y + event.clientY - drag.y }));
  };
  const finishCrop = () => {
    const image = imageRef.current;
    if (!image || !imageSize.width) return;
    const outputSize = 256;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.beginPath();
    context.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    context.clip();
    const scale = Math.max(outputSize / imageSize.width, outputSize / imageSize.height) * zoom;
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;
    context.drawImage(image, (outputSize - width) / 2 + offset.x * outputSize / stageSize, (outputSize - height) / 2 + offset.y * outputSize / stageSize, width, height);
    canvas.toBlob(blob => { if (blob) onSave(blob); }, 'image/png');
  };
  const zoomImage = value => {
    const nextZoom = Number(value);
    setZoom(nextZoom);
    setOffset(current => clampOffset(current, nextZoom));
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="profile-crop-dialog">
      <DialogHeader><DialogTitle>{tr(language, 'profilePicture')}</DialogTitle></DialogHeader>
      <p className="profile-crop-help">{tr(language, 'dragToCrop')}</p>
      <div className="profile-crop-stage" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
        <img ref={imageRef} src={source} alt="" draggable="false" onLoad={event => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} style={{ width: imageWidth, height: imageHeight, left: `calc(50% + ${offset.x}px)`, top: `calc(50% + ${offset.y}px)` }} />
      </div>
      <label className="profile-crop-zoom">{tr(language, 'zoom')}<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => zoomImage(event.target.value)} /></label>
      <div className="profile-crop-actions">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tr(language, 'cancel')}</Button>
        <Button type="button" onClick={finishCrop} disabled={!imageSize.width}>{tr(language, 'usePhoto')}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}

function ActivityDialog({ kind, activity, open, onOpenChange, onSave, onDelete, lastFeed, language }) {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [amounts, setAmounts] = useState({ formulaAmount: '', breastmilkAmount: '' });
  const [breastfeeding, setBreastfeeding] = useState(false);
  const [diaperWet, setDiaperWet] = useState(false);
  const [diaperPoop, setDiaperPoop] = useState(false);
  const [time, setTime] = useState(() => getTimeSlot());
  const [date, setDate] = useState(() => localDateValue());
  const dateInputRef = useRef(null);
  const dirtyRef = useRef(false);
  const versionRef = useRef(0);
  const onSaveRef = useRef(onSave);
  const saveDraftRef = useRef(() => {});
  onSaveRef.current = onSave;
  const markDirty = () => {
    dirtyRef.current = true;
    versionRef.current += 1;
  };
  const config = kind ? kinds[kind] : null;
  useEffect(() => {
    if (!open) return;
    dirtyRef.current = false;
    versionRef.current += 1;
    setTime(activity ? getTimeSlot(new Date(activity.at)) : getTimeSlot());
    setDate(activity ? localDateValue(new Date(activity.at)) : localDateValue());
    if (kind === 'diaper') {
      setDiaperWet(activity?.detail === 'Both' || activity?.detail?.startsWith('Wet') || false);
      setDiaperPoop(activity?.detail === 'Both' || activity?.detail?.startsWith('Poop') || false);
    }
    setNote(activity?.note ?? (kind === 'sleep' && activity?.detail && activity.detail !== 'Sleep' ? activity.detail : ''));
    setAmount(activity?.amount == null ? '' : String(activity.amount));
    if (kind === 'feed') {
      setBreastfeeding(Boolean(activity?.breastfeeding ?? lastFeed?.breastfeeding));
      setAmounts({
        formulaAmount: (activity?.formulaAmount ?? lastFeed?.formulaAmount) == null ? '' : String(activity?.formulaAmount ?? lastFeed?.formulaAmount),
        breastmilkAmount: (activity?.breastmilkAmount ?? lastFeed?.breastmilkAmount) == null ? '' : String(activity?.breastmilkAmount ?? lastFeed?.breastmilkAmount),
      });
    }
  }, [open, kind, activity?.id]);
  const at = activityDateAtTime(date, time);
  const draft = () => {
    if (kind === 'feed') {
      const parsed = Object.fromEntries(Object.entries(amounts).map(([key, value]) => [key, value === '' ? null : Number(value)]));
      return { id: activity?.id, kind, at, detail: 'Feed', note: note.trim(), breastfeeding, ...parsed };
    }
    if (kind === 'pump') return { id: activity?.id, kind, at, detail: 'Pumping session', note: note.trim(), amount: amount === '' ? null : Number(amount) };
    if (kind === 'diaper') return { id: activity?.id, kind, at, detail: diaperWet && diaperPoop ? 'Both' : diaperWet ? 'Wet' : diaperPoop ? 'Poop' : '', note: note.trim() };
    if (kind === 'sleep') return { id: activity?.id, kind, at, detail: 'Sleep', note: note.trim(), amount: amount.trim() };
  };
  saveDraftRef.current = () => {
    if (!activity || !dirtyRef.current) return;
    dirtyRef.current = false;
    onSaveRef.current(draft(), { close: false, silent: true });
  };
  useEffect(() => {
    if (!open || !activity || !dirtyRef.current) return undefined;
    const scheduledVersion = versionRef.current;
    const timer = window.setTimeout(() => {
      if (dirtyRef.current && scheduledVersion === versionRef.current) saveDraftRef.current();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [open, activity?.id, kind, time, date, note, amount, amounts, breastfeeding, diaperWet, diaperPoop]);
  return <Dialog open={open} onOpenChange={nextOpen => {
    if (!nextOpen) saveDraftRef.current();
    onOpenChange(nextOpen);
  }}>
    {config && <DialogContent className="activity-sheet-content">
      <DialogHeader>
        <ActivityIcon kind={kind} size={20} />
        <DialogTitle>{activity ? tr(language, 'edit') : tr(language, 'log')} {tr(language, kind).toLowerCase()}</DialogTitle>
      </DialogHeader>
      {activity && <p className="autosave-hint">{tr(language, 'autoSaveHint')}</p>}
      <form className="activity-form" onSubmit={event => event.preventDefault()}>
        <div className="time-field-group">
          <label className="time-picker-row">{tr(language, 'time')}<input type="time" step="600" value={time} onChange={e => { markDirty(); setTime(e.target.value); }} required /></label>
          <div className="event-date-row">
            <input ref={dateInputRef} className="date-picker-input" type="date" value={date} onChange={e => { markDirty(); setDate(e.target.value); }} required aria-label={tr(language, 'date')} />
            <button type="button" className="date-edit-button" aria-label={`${tr(language, 'edit')} ${tr(language, 'date').toLowerCase()}, ${new Date(`${date}T12:00:00`).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en')}`} onClick={() => { const input = dateInputRef.current; if (input?.showPicker) input.showPicker(); else input?.click(); }}>
              <span>{new Date(`${date}T12:00:00`).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en', { month: 'short', day: 'numeric', year: 'numeric' })}</span><Pencil size={13}/>
            </button>
          </div>
        </div>
        {kind === 'feed' && <div className="feed-amounts">
          <AmountStepper label={tr(language, 'formula')} value={amounts.formulaAmount} onChange={value => { markDirty(); setAmounts(current => ({ ...current, formulaAmount: value })); }} language={language} />
          <AmountStepper label={tr(language, 'breastmilk')} value={amounts.breastmilkAmount} onChange={value => { markDirty(); setAmounts(current => ({ ...current, breastmilkAmount: value })); }} language={language} />
          <EventToggle label={tr(language, 'breastfeeding')} checked={breastfeeding} onChange={() => { markDirty(); setBreastfeeding(value => !value); }} />
        </div>}
        {kind === 'pump' && <AmountStepper label={tr(language, 'amount')} value={amount} onChange={value => { markDirty(); setAmount(value); }} language={language} />}
        {kind === 'diaper' && <div className="diaper-toggles" aria-label="Diaper contents">
          <EventToggle label={tr(language, 'wet')} checked={diaperWet} onChange={() => { markDirty(); setDiaperWet(value => !value); }} />
          <EventToggle label={tr(language, 'poop')} checked={diaperPoop} onChange={() => { markDirty(); setDiaperPoop(value => !value); }} />
        </div>}
        {kind === 'sleep' && <>
          <label>{tr(language, 'duration')}<input value={amount} onChange={e => { markDirty(); setAmount(e.target.value); }} placeholder={tr(language, 'sleepDurationPlaceholder')} /></label>
        </>}
        <label>{tr(language, 'note')}<input value={note} onChange={e => { markDirty(); setNote(e.target.value); }} placeholder={tr(language, 'addNote')} /></label>
        {activity && <button type="button" className="delete-record" onClick={() => onDelete(activity.id)}>{tr(language, 'delete')}</button>}
      </form>
    </DialogContent>}
  </Dialog>;
}

function defaultDetail(kind) {
  return { feed: 'Nursed', pump: 'Pumping session', diaper: 'Diaper changed', sleep: 'Sleep' }[kind];
}

function activitySubtitle(activity, language) {
  const note = activity.note?.trim() || (activity.kind === 'sleep' && activity.detail && activity.detail !== 'Sleep' ? activity.detail.trim() : '');
  if (activity.kind === 'feed') {
    return [
      activity.formulaAmount != null && `${tr(language, 'formula')} ${activity.formulaAmount} ${tr(language, 'ml')}`,
      activity.breastmilkAmount != null && `${tr(language, 'breastmilk')} ${activity.breastmilkAmount} ${tr(language, 'ml')}`,
      note,
    ].filter(Boolean).join(' · ');
  }
  if (activity.kind === 'pump') return [activity.amount != null && `${activity.amount} ${tr(language, 'ml')}`, note].filter(Boolean).join(' · ');
  if (activity.kind === 'diaper') return note;
  return [note, activity.amount].filter(Boolean).join(' · ');
}

function AuthPanel({ language }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithUsername(username.trim(), password);
    } catch (authError) {
      setError(authError.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-page"><section className="auth-panel">
    <span className="brand-mark"><Baby size={22} /></span>
    <h1>little days</h1>
    <form className="auth-form" onSubmit={submit}>
      <label>{tr(language, 'name')}<input value={username} onChange={event => setUsername(event.target.value.toLowerCase())} autoComplete="username" minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9._-]{2,31}" title="Use 3–32 lowercase letters, numbers, dots, underscores, or hyphens." required /></label>
      <label>{tr(language, 'password')}<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" minLength={6} required /></label>
      <Button type="submit" disabled={busy}>{busy ? tr(language, 'wait') : tr(language, 'signIn')}</Button>
    </form>
    {error && <p className="auth-error" role="alert">{error}</p>}
  </section></div>;
}

function App() {
  const [activities, setActivities] = useState(getSavedActivities);
  const [quickActions, setQuickActions] = useState(getQuickActions);
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'zh');
  const [accountSubmenu, setAccountSubmenu] = useState(null);
  const [user, setUser] = useState(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [cropSource, setCropSource] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [activeKind, setActiveKind] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [toast, setToast] = useState('');
  const accountMenuRef = useRef(null);
  const profilePictureInputRef = useRef(null);
  const profilePictureUrlRef = useRef('');
  const toggleQuickAction = (kind) => {
    setQuickActions(current => {
      if (current.length === 1 && current.includes(kind)) return current;
      const next = current.includes(kind) ? current.filter(item => item !== kind) : [...current, kind];
      localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(next));
      return next;
    });
  };
  const changeLanguage = value => {
    setLanguage(value);
    localStorage.setItem(LANGUAGE_KEY, value);
  };
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);
  useEffect(() => {
    if (!user || !supabase) {
      setProfilePicture('');
      return undefined;
    }
    let active = true;
    let objectUrl = '';
    const loadProfilePicture = async () => {
      const { data, error } = await supabase.storage.from(PROFILE_PICTURES_BUCKET).download(`${user.id}/avatar.png`);
      if (!active) return;
      if (error) {
        if (!/not found|object does not exist/i.test(error.message)) setToast(`无法加载头像：${error.message}`);
        setProfilePicture('');
        return;
      }
      objectUrl = URL.createObjectURL(data);
      profilePictureUrlRef.current = objectUrl;
      setProfilePicture(objectUrl);
    };
    loadProfilePicture();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (profilePictureUrlRef.current === objectUrl) profilePictureUrlRef.current = '';
    };
  }, [user?.id]);
  const closePhotoCrop = () => {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource('');
  };
  const handleProfilePictureFile = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setCropSource(URL.createObjectURL(file));
  };
  const saveProfilePicture = async blob => {
    if (!user || !supabase) return;
    const path = `${user.id}/avatar.png`;
    const { error } = await supabase.storage.from(PROFILE_PICTURES_BUCKET).upload(path, blob, { contentType: 'image/png', cacheControl: '3600', upsert: true });
    if (error) {
      setToast(`头像保存失败：${error.message}`);
      return;
    }
    if (profilePictureUrlRef.current) URL.revokeObjectURL(profilePictureUrlRef.current);
    const objectUrl = URL.createObjectURL(blob);
    profilePictureUrlRef.current = objectUrl;
    setProfilePicture(objectUrl);
    closePhotoCrop();
  };
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
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
        setToast(`${tr(language, 'loadActivitiesFailed')}: ${error.message}`);
        return;
      }
      if (data.length) {
        const loaded = data.map(activityFromRow);
        setActivities(loaded);
        localStorage.setItem(`${STORAGE_KEY}.${user.id}`, JSON.stringify(loaded));
        return;
      }
      setActivities([]);
      localStorage.setItem(`${STORAGE_KEY}.${user.id}`, '[]');
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
      .catch(error => { if (active) setToast(`${tr(language, 'loadNameFailed')}: ${error.message}`); });
    return () => { active = false; };
  }, [user]);
  const lastFeed = useMemo(() => activities.filter(item => item.kind === 'feed').sort((a, b) => new Date(b.at) - new Date(a.at))[0], [activities]);
  const visibleActivities = useMemo(() => [...activities].sort((a, b) => new Date(b.at) - new Date(a.at)), [activities]);
  const logActivity = async (activity, { close = true, silent = false } = {}) => {
    const saved = { ...activity, id: activity.id || crypto.randomUUID() };
    const next = activity.id
      ? activities.map(item => item.id === activity.id ? saved : item)
      : [saved, ...activities];
    setActivities(next);
    localStorage.setItem(user ? `${STORAGE_KEY}.${user.id}` : STORAGE_KEY, JSON.stringify(next));
    if (supabase && user) {
      const { error } = await supabase.from('baby_activities').upsert(activityToRow(saved, user.id));
      if (error) {
        setToast(`${tr(language, 'saveFailed')}: ${error.message}`);
        return;
      }
    }
    if (close) {
      setActiveKind(null);
      setEditingActivity(null);
    }
    if (!silent) {
      setToast(`${tr(language, activity.kind)} ${tr(language, activity.id ? 'updated' : 'logged')}`);
      window.setTimeout(() => setToast(''), 2200);
    }
  };
  const createActivity = (kind) => {
    const activity = { kind, at: new Date().toISOString(), detail: defaultDetail(kind) };
    if (kind === 'feed') {
      activity.detail = 'Feed';
      activity.breastfeeding = Boolean(lastFeed?.breastfeeding);
      activity.formulaAmount = null;
      activity.breastmilkAmount = null;
    } else if (kind === 'diaper') {
      activity.detail = 'Wet';
    } else if (kind === 'pump') {
      activity.detail = 'Pumping session';
      activity.amount = null;
    } else if (kind === 'sleep') {
      activity.detail = 'Sleep';
      activity.amount = '';
    }
    logActivity(activity);
  };
  const removeActivity = async (id) => {
    const next = activities.filter(item => item.id !== id);
    setActivities(next);
    localStorage.setItem(user ? `${STORAGE_KEY}.${user.id}` : STORAGE_KEY, JSON.stringify(next));
    if (supabase && user) {
      const { error } = await supabase.from('baby_activities').delete().eq('id', id);
      if (error) {
        setToast(`${tr(language, 'deleteFailed')}: ${error.message}`);
        return;
      }
    }
    setEditingActivity(null);
  };

  if (isSupabaseConfigured && authLoading) return <div className="auth-page"><div className="auth-panel">{tr(language, 'loading')}</div></div>;
  if (isSupabaseConfigured && !user) return <AuthPanel language={language} />;

  return <div className="app-shell">
    <header className="topbar">
      {user ? <div className="profile-identity">{profilePicture ? <img className="profile-photo" src={profilePicture} alt="" /> : <span className="baby-avatar">{(accountUsername || user.user_metadata?.username || '?').slice(0, 1).toUpperCase()}</span>}<span className="profile-name">{accountUsername || user.user_metadata?.username || '…'}</span></div> : <a className="brand" href="#top" aria-label={tr(language, 'home')}><span className="brand-mark"><Baby size={19} /></span><span>little days</span></a>}
      {user ? <div className="account-menu" ref={accountMenuRef}>
        <button type="button" className="account-trigger" aria-label={tr(language, 'settings')} aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(open => !open)}>
          <Settings size={21} strokeWidth={1.9}/>
        </button>
        {accountMenuOpen && <div className="account-dropdown" role="menu" aria-label={tr(language, 'accountMenu')}>
          <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setAccountSubmenu(null); profilePictureInputRef.current?.click(); }}>{tr(language, 'profilePicture')}</button>
          <div className="account-submenu-wrap">
            <button type="button" role="menuitem" className="account-menu-action" aria-haspopup="menu" aria-expanded={accountSubmenu === 'language'} onClick={() => setAccountSubmenu(value => value === 'language' ? null : 'language')}><span>{tr(language, 'language')}</span><span className="account-current-value">{tr(language, language === 'zh' ? 'chinese' : 'english')}</span><ChevronRight size={15}/></button>
            {accountSubmenu === 'language' && <div className="account-submenu" role="menu" aria-label={tr(language, 'language')}>
              {['zh', 'en'].map(value => <button key={value} type="button" role="menuitemradio" aria-checked={language === value} onClick={() => changeLanguage(value)}><span>{value === 'zh' ? '中文' : 'English'}</span>{language === value && <Check size={16}/>}</button>)}
            </div>}
          </div>
          <div className="account-submenu-wrap">
            <button type="button" role="menuitem" className="account-menu-action" aria-haspopup="menu" aria-expanded={accountSubmenu === 'quick-actions'} onClick={() => setAccountSubmenu(value => value === 'quick-actions' ? null : 'quick-actions')}><span>{tr(language, 'customize')}</span><ChevronRight size={15}/></button>
            {accountSubmenu === 'quick-actions' && <div className="account-submenu" role="menu" aria-label={tr(language, 'quickActions')}>
              {Object.keys(kinds).map(kind => <button key={kind} type="button" role="menuitemcheckbox" aria-checked={quickActions.includes(kind)} disabled={quickActions.length === 1 && quickActions.includes(kind)} onClick={() => toggleQuickAction(kind)}><span>{tr(language, kind)}</span>{quickActions.includes(kind) && <Check size={16}/>}</button>)}
            </div>}
          </div>
          <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); supabase.auth.signOut(); }}>{tr(language, 'signOut')}</button>
        </div>}
        <input ref={profilePictureInputRef} className="profile-picture-input" type="file" accept="image/*" onChange={handleProfilePictureFile} />
      </div> : null}
    </header>
    <main id="top" className="page-wrap">
      <section className="quick-section" aria-labelledby="quick-heading">
        <div className="section-heading"><h2 id="quick-heading">{tr(language, 'quickActions')}</h2></div>
        <div className="quick-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(quickActions.length, 4))}, minmax(0, 1fr))` }}>
          {Object.entries(kinds).filter(([kind]) => quickActions.includes(kind)).map(([kind, item]) => {
            const Icon = item.icon;
            return <Button key={kind} variant="outline" className={`quick-action ${item.tint}`} onClick={() => createActivity(kind)}>
              <span className="quick-icon"><Icon size={21} strokeWidth={1.8}/></span><span className="quick-label">{tr(language, kind)}</span>
            </Button>;
          })}
        </div>
      </section>

      <section className="quick-section recent-section" aria-labelledby="recent-heading">
        <div className="section-heading"><h2 id="recent-heading">{tr(language, 'recentActivity')}</h2></div>
        <div className="activity-list">
            {visibleActivities.map((activity, index) => {
              const subtitle = activitySubtitle(activity, language);
              return <article className="activity-row" key={activity.id} role="button" tabIndex={0} onClick={() => setEditingActivity(activity)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEditingActivity(activity); } }}>
                <ActivityIcon kind={activity.kind} />
                {index < visibleActivities.length - 1 && <span className="timeline-line"/>}
                <div className="activity-copy"><div className="activity-title"><strong>{tr(language, activity.kind)}</strong><span className="activity-time">{timeAgo(activity.at, language)}</span></div>{subtitle && <div className="activity-detail">{subtitle}</div>}</div>
              </article>;
            })}
            {visibleActivities.length === 0 && <div className="empty-feed"><span className="empty-icon"><Sparkles size={19}/></span><strong>{tr(language, 'noActivity')}</strong><Button variant="outline" size="sm" onClick={() => createActivity('feed')}>{tr(language, 'log')}</Button></div>}
        </div>
      </section>
    </main>
    <ActivityDialog kind={activeKind || editingActivity?.kind} activity={editingActivity} open={Boolean(activeKind || editingActivity)} lastFeed={lastFeed} language={language} onOpenChange={(open) => { if (!open) { setActiveKind(null); setEditingActivity(null); } }} onSave={logActivity} onDelete={removeActivity}/>
    <ProfilePictureCropDialog open={Boolean(cropSource)} source={cropSource} language={language} onOpenChange={open => { if (!open) closePhotoCrop(); }} onSave={saveProfilePicture}/>
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
