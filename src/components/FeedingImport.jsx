import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { parseFeedingCsv } from '../lib/feedingCsv';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export function FeedingImport({ language, disabled, onImport }) {
  const zh = language === 'zh';
  const title = zh ? '批量导入喂奶记录' : 'Import feeding records';
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const pending = useRef(null);
  const importedRecordId = useRef(null);

  function changeOpen(next) {
    if (savingRef.current) return;
    setOpen(next);
    if (!next) {
      setCsv('');
      setError('');
      pending.current = null;
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    const { records, errorLine } = parseFeedingCsv(csv);
    if (errorLine) {
      setError(zh ? `第 ${errorLine} 行无效。请检查日期、时间和两列奶量。` : `Line ${errorLine} is invalid. Check the date, time, and both milk amounts.`);
      return;
    }
    if (!records.length) {
      setError(zh ? '请粘贴至少一笔喂奶记录。' : 'Paste at least one feeding record.');
      return;
    }

    if (pending.current?.csv !== csv) {
      pending.current = { csv, records: records.map(record => ({ ...record, id: crypto.randomUUID() })) };
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      importedRecordId.current = await onImport(pending.current.records);
      savingRef.current = false;
      changeOpen(false);
    } catch {
      setError(zh ? '导入失败，请重试。' : 'Import failed. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>
      <Button type="button" className="quick-action feed-import-trigger" aria-label={title} title={title} disabled={disabled}>
        <Upload size={17} aria-hidden="true" />
      </Button>
    </DialogTrigger>
    <DialogContent className="activity-sheet-content feed-import-dialog" aria-describedby={undefined}
      onCloseAutoFocus={event => {
        const id = importedRecordId.current;
        importedRecordId.current = null;
        if (!id) return;
        const record = document.getElementById(`activity-${id}`);
        if (!record) return;
        event.preventDefault();
        record.focus({ preventScroll: true });
        record.scrollIntoView({ block: 'center' });
      }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <form className="activity-form feed-import-form" onSubmit={submit}>
        <label>{zh ? '样例' : 'Example'}
          <textarea className="feed-import-example" rows={2} readOnly tabIndex={-1}
            value={`${zh ? '日期,时间,母乳,水奶' : 'Date,Time,Breastmilk,Formula'}\n11.6,09:05,120,0`} />
        </label>
        <label>CSV
          <textarea rows={7} value={csv} disabled={saving} spellCheck={false} onChange={event => setCsv(event.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <Button type="submit" disabled={saving || !csv.trim()}>{saving ? (zh ? '正在导入…' : 'Importing…') : (zh ? '导入' : 'Import')}</Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>{zh ? '取消' : 'Cancel'}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
