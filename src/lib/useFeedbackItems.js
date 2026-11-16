import { startForegroundSync } from './foregroundSync';
import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function applyChanges(items, changes) {
  const result = new Map(items.map(item => [item.id, item]));
  for (const { id, item } of changes) {
    if (item) result.set(id, item);
    else result.delete(id);
  }
  return [...result.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function toRow(item, userId) {
  return { id: item.id, user_id: userId, title: item.title, checked: item.checked, created_at: item.createdAt };
}

export function useFeedbackItems(userId) {
  const legacyKey = `little-days.feedback.v1.${userId || 'local'}`;
  const queueKey = `${legacyKey}.pending`;
  const cloud = Boolean(supabase && userId);
  const [legacy] = useState(() => {
    const now = Date.now();
    return readList(legacyKey).map((item, index) => ({
      ...item, createdAt: item.createdAt ?? new Date(now - index).toISOString(),
    }));
  });
  const [savedQueue] = useState(() => cloud ? readList(queueKey) : []);
  const queue = useRef(savedQueue);
  const migrate = useRef(cloud && legacy.length > 0);
  const scheduleSync = useRef(null);
  const [items, setItems] = useState(() => applyChanges(legacy, savedQueue));
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (!cloud) return undefined;
    let active = true;
    let syncing = false;
    let timer;
    const table = () => supabase.from('feedback_items');

    async function sync() {
      if (!active || syncing || document.hidden) return;
      syncing = true;
      try {
        if (migrate.current) {
          for (let offset = 0; offset < legacy.length && active; offset += 100) {
            const { error } = await table().upsert(legacy.slice(offset, offset + 100).map(item => toRow(item, userId)), {
              onConflict: 'user_id,id', ignoreDuplicates: true,
            });
            if (error) throw error;
          }
          if (!active) return;
          localStorage.removeItem(legacyKey);
          migrate.current = false;
        }

        for (const change of queue.current) {
          const { id, item } = change;
          const { error } = await (item
            ? table().upsert(toRow(item, userId), { onConflict: 'user_id,id' })
            : table().delete().eq('user_id', userId).eq('id', id));
          if (error) throw error;
          if (!active) return;
          const remaining = queue.current.filter(pending => pending !== change);
          localStorage.setItem(queueKey, JSON.stringify(remaining));
          queue.current = remaining;
        }

        const records = [];
        for (let offset = 0; active; offset += 500) {
          const { data, error } = await table().select('id,title,checked,created_at')
            .eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
          if (error) throw error;
          records.push(...data.map(({ created_at, ...item }) => ({ ...item, createdAt: created_at })));
          if (data.length < 500) break;
        }
        if (active) {
          setItems(applyChanges(records, queue.current));
          setSaveFailed(false);
          if (queue.current.length) scheduleSync.current();
        }
      } catch {
        if (active) setSaveFailed(true);
      } finally {
        syncing = false;
      }
    }

    scheduleSync.current = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 350);
    };
    const stop = startForegroundSync(sync, { shouldRefresh: () => !syncing });
    return () => {
      active = false;
      scheduleSync.current = null;
      window.clearTimeout(timer);
      stop();
    };
  }, [cloud, legacy, legacyKey, queueKey, userId]);

  function saveItem(id, item) {
    const change = { id, item };
    try {
      if (cloud) {
        const nextQueue = [...queue.current.filter(change => change.id !== id), change];
        localStorage.setItem(queueKey, JSON.stringify(nextQueue));
        queue.current = nextQueue;
        scheduleSync.current?.();
      } else {
        localStorage.setItem(legacyKey, JSON.stringify(applyChanges(items, [change])));
      }
    } catch {
      setSaveFailed(true);
      return false;
    }
    setItems(current => applyChanges(current, [change]));
    if (!cloud) setSaveFailed(false);
    return true;
  }

  return { items, saveItem, saveFailed };
}
