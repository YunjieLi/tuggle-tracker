import React, { useState } from 'react';

const labels = {
  zh: { title: '报反馈', newItem: '添加', delete: '删除', completed: '已完成', saveFailed: '无法保存，请重试。' },
  en: { title: 'Feedback', newItem: 'Add', delete: 'Delete', completed: 'Completed', saveFailed: 'Could not save. Try again.' },
};

function FeedbackRow({ item, deleteLabel, onSave, onDelete }) {
  const [draftTitle, setDraftTitle] = useState(null);
  const editing = draftTitle !== null;
  const title = draftTitle?.trim() || item.title;

  function finishEdit(checked = item.checked) {
    if ((title === item.title && checked === item.checked) || onSave({ ...item, title, checked })) {
      setDraftTitle(null);
    }
  }

  return <li className="feedback-row" onBlur={event => {
    if (editing && !event.currentTarget.contains(event.relatedTarget)) finishEdit();
  }}>
    <input type="checkbox" aria-label={item.title} checked={item.checked}
      onMouseDown={event => { if (editing) event.preventDefault(); }}
      onChange={event => finishEdit(event.target.checked)} />
    {editing ? <>
      <input className="feedback-row-text" type="text" aria-label={item.title} autoFocus
        value={draftTitle} onChange={event => setDraftTitle(event.target.value)}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Enter') finishEdit();
          if (event.key === 'Escape') setDraftTitle(null);
        }} />
      <button className="feedback-delete" type="button" aria-label={`${deleteLabel} ${item.title}`}
        onMouseDown={event => event.preventDefault()}
        onClick={onDelete}>×</button>
    </> : <button className="feedback-edit" type="button"
      onClick={() => setDraftTitle(item.title)}>{item.title}</button>}
  </li>;
}

export function FeedbackChecklist({ language, userId }) {
  const copy = labels[language];
  const storageKey = `little-days.feedback.v1.${userId || 'local'}`;
  const [items, setItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [draft, setDraft] = useState(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const visibleItems = items.filter(item => item.id !== draft?.id);
  const openItems = visibleItems.filter(item => !item.checked);
  const completedItems = visibleItems.filter(item => item.checked);

  function saveItems(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setSaveFailed(true);
      return false;
    }
    setItems(next);
    setSaveFailed(false);
    return true;
  }

  function saveDraft({ id, title: rawTitle }, checked = false) {
    const title = rawTitle.trim();
    const remaining = items.filter(item => item.id !== id);
    return saveItems(title ? [{ id, title, checked }, ...remaining] : remaining);
  }

  function updateDraft(rawTitle) {
    const next = { id: draft?.id ?? crypto.randomUUID(), title: rawTitle };
    setDraft(next);
    saveDraft(next);
  }

  function finishDraft(checked = false) {
    if (!draft) return;
    if (saveDraft(draft, checked)) setDraft(null);
  }

  function renderItems(list) {
    return list.map(item => <FeedbackRow key={item.id} item={item} deleteLabel={copy.delete}
      onSave={updated => saveItems(items.map(entry => entry.id === item.id ? updated : entry))}
      onDelete={() => saveItems(items.filter(entry => entry.id !== item.id))} />);
  }

  return <main className="page-wrap feedback-page">
    <h1 className="page-title">{copy.title}</h1>
    <section className="baby-panel" aria-label={copy.title}>
      <ul className="feedback-items">
        <li className="feedback-row feedback-draft" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) finishDraft();
        }}>
          <input type="checkbox" aria-label={copy.completed} checked={false} disabled={!draft?.title.trim()}
            onChange={() => finishDraft(true)} />
          <input className="feedback-row-text" type="text" aria-label={copy.newItem} placeholder={copy.newItem}
            value={draft?.title ?? ''}
            onChange={event => updateDraft(event.target.value)} onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                finishDraft();
              }
            }} />
        </li>
        {renderItems(openItems)}
      </ul>
      {saveFailed && <p role="alert">{copy.saveFailed}</p>}
    </section>
    {completedItems.length > 0 && <details className="baby-panel feedback-completed">
      <summary>{copy.completed}</summary>
      <ul className="feedback-items">{renderItems(completedItems)}</ul>
    </details>}
  </main>;
}
