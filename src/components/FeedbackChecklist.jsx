import React, { useState } from 'react';
import { useFeedbackItems } from '../lib/useFeedbackItems';
import { BabyPage } from './BabyPages';

const labels = {
  zh: { title: '报反馈', newItem: '添加', delete: '删除', completed: '已完成', saveFailed: '反馈同步失败，将自动重试。' },
  en: { title: 'Feedback', newItem: 'Add', delete: 'Delete', completed: 'Completed', saveFailed: 'Could not sync feedback. Changes will retry automatically.' },
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
  const { items, saveItem, saveFailed } = useFeedbackItems(userId);
  const [draft, setDraft] = useState(null);
  const visibleItems = items.filter(item => item.id !== draft?.id);
  const openItems = visibleItems.filter(item => !item.checked);
  const completedItems = visibleItems.filter(item => item.checked);

  function saveDraft({ id, title: rawTitle, createdAt }, checked = false) {
    const title = rawTitle.trim();
    if (!title && !items.some(item => item.id === id)) return true;
    return saveItem(id, title ? { id, title, checked, createdAt } : null);
  }

  function updateDraft(rawTitle) {
    const next = {
      ...(draft ?? { id: crypto.randomUUID(), createdAt: new Date().toISOString() }),
      title: rawTitle,
    };
    setDraft(next);
    saveDraft(next);
  }

  function finishDraft(checked = false) {
    if (!draft) return;
    if (saveDraft(draft, checked)) setDraft(null);
  }

  function renderItems(list) {
    return list.map(item => <FeedbackRow key={item.id} item={item} deleteLabel={copy.delete}
      onSave={updated => saveItem(item.id, updated)}
      onDelete={() => saveItem(item.id, null)} />);
  }

  return <BabyPage title={copy.title} language={language}>
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
  </BabyPage>;
}
