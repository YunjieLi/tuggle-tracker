import { formatAppDate } from '../lib/dates';
import React, { useEffect, useId, useState } from 'react';
import { Baby, Camera, ChartLine, ChevronLeft, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ageInDays, baby, percentile, referenceMaxDay, referenceMeasurement } from '../lib/growth';
import { supabase } from '../lib/supabase';

const storageKey = 'little-days.growth-records';
const fields = [
  ['weight_kg', 'Weight', '体重', 'kg'],
  ['length_cm', 'Length / height', '身长 / 身高', 'cm'],
  ['head_cm', 'Head circumference', '头围', 'cm'],
];

const unitFactors = { kg: 1, lb: 0.45359237, cm: 1, inch: 2.54 };

function MeasurementDateInput({ zh, initialDate }) {
  const [date, setDate] = useState(initialDate);
  return <label>{zh ? '测量日期' : 'Measurement date'}
    <span className="growth-date-field">
      <span aria-hidden="true">{date ? formatAppDate(date, zh ? 'zh' : 'en') : ''}</span>
      <input type="date" name="measured_on" min={baby.birthDate} defaultValue={initialDate} onInput={event => setDate(event.currentTarget.value)} />
    </span>
  </label>;
}

function MeasurementInput({ field, zh, value }) {
  const [key, en, cn, baseUnit] = field;
  const [unit, setUnit] = useState(baseUnit);
  const label = zh ? cn : en;
  const mixed = unit === 'lb+oz';
  const units = baseUnit === 'kg' ? ['kg', 'lb', 'lb+oz'] : ['cm', 'inch'];
  return <div className="growth-measurement">
    <label htmlFor={key}>{label}</label>
    <div className="growth-measurement-inputs">
      <div className="growth-unit-field">
        <input id={key} name={key} defaultValue={value ?? ''} type="number" inputMode={mixed ? 'numeric' : 'decimal'} min={mixed ? '0' : '0.01'} step={mixed ? '1' : 'any'} />
        {mixed && <span aria-hidden="true" className="measurement-unit">lb</span>}
        <select name={key + '_unit'} aria-label={label + (zh ? '单位' : ' unit')} value={unit} onChange={event => setUnit(event.target.value)}>
          {units.map(option => <option key={option}>{option}</option>)}
        </select>
      </div>
      {mixed && <div className="growth-unit-field"><input name="weight_oz" aria-label={zh ? '体重（盎司）' : 'Weight (oz)'} type="number" inputMode="decimal" min="0" max="15.999999" step="any" /><span aria-hidden="true" className="measurement-unit">oz</span></div>}
    </div>
  </div>;
}

export function BabyPage({ title, language, children }) {
  return <main className="page-wrap baby-page">
    <div className="baby-page-heading">
      <a className="baby-back" href="#top" aria-label={language === 'zh' ? '返回首页' : 'Back to home'}><ChevronLeft size={22} aria-hidden="true" /></a>
      <h1 className="page-title">{title}</h1>
    </div>
    {children}
  </main>;
}

export function BabyProfile({ language, avatar, onUpload, children }) {
  const zh = language === 'zh';
  return <BabyPage title={zh ? '宝宝档案' : 'Baby profile'} language={language}>
    <section className="baby-panel baby-details">
      <div className="baby-photo-actions">
        {avatar ? <img className="baby-portrait" src={avatar} alt={baby.name} /> : <span className="baby-portrait" role="img" aria-label={zh ? '默认宝宝头像' : 'Default baby avatar'}><Baby size={42} /></span>}
        <Button type="button" size="icon" className="baby-photo-camera" disabled={!onUpload}
          aria-label={zh ? '上传或更换头像' : 'Upload or change profile photo'} onClick={onUpload}>
          <Camera size={16} aria-hidden="true" />
        </Button>
      </div>
      <dl>
        <dt>{zh ? '姓名' : 'Name'}</dt><dd>{baby.name}</dd>
        <dt>{zh ? '生日' : 'Date of birth'}</dt><dd><time dateTime={baby.birthDate}>{formatAppDate(baby.birthDate, language)}</time></dd>
        <dt>{zh ? '性别' : 'Sex'}</dt><dd>{zh ? '女' : 'Female'}</dd>
      </dl>
    </section>
    {children}
  </BabyPage>;
}

// Standard normal quantiles for P10 through P90.
const referenceZScores = [-1.281552, -0.841621, -0.524401, -0.253347, 0, 0.253347, 0.524401, 0.841621, 1.281552];

function GrowthPlot({ records, language, standard, metric }) {
  const zh = language === 'zh';
  const [, en, cn, unit] = fields.find(([key]) => key === metric);
  const label = zh ? cn : en;
  const clipId = useId();
  const points = records.map(record => ({
    id: record.id, day: ageInDays(record.measured_on), value: Number(record[metric]), date: record.measured_on,
  })).filter(({ day, value }) => day >= 0 && Number.isFinite(value)).sort((a, b) => a.day - b.day);
  if (!points.length) return <section className="baby-panel">
    <p>{zh ? '暂无带日期的测量值。' : 'No dated measurements yet.'}</p>
  </section>;

  const earliest = points[0].day;
  const latest = points.at(-1).day;
  const dayPadding = Math.max(1, Math.ceil((latest - earliest) * 0.05));
  const firstDay = Math.max(0, earliest - dayPadding);
  const lastDay = latest + dayPadding;
  const dayStep = Math.max(1, Math.ceil((lastDay - firstDay) / 5));
  const referenceEnd = Math.min(lastDay, referenceMaxDay(standard, metric));
  const days = firstDay > referenceEnd ? [] : [...new Set([
    ...Array.from({ length: 101 }, (_, i) => Math.round(firstDay + (referenceEnd - firstDay) * i / 100)),
    ...(standard === 'WHO' && metric === 'length_cm' && firstDay <= 730 && referenceEnd >= 731 ? [730, 731] : []),
  ])].sort((a, b) => a - b);
  const curves = referenceZScores.map(z => days.map(day => referenceMeasurement(standard, metric, day, z)));
  const values = points.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const valuePadding = max > min ? (max - min) * 0.08 : Math.max(min * 0.05, 0.01);
  const roughStep = (max - min + 2 * valuePadding) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10].find(value => value >= roughStep / magnitude) * magnitude;
  const lower = Math.max(0, Math.floor((min - valuePadding) / step) * step);
  const upper = Math.ceil((max + valuePadding) / step) * step;
  const x = day => 47 + (day - firstDay) / (lastDay - firstDay) * 337;
  const y = value => 214 - (value - lower) / (upper - lower) * 187;
  const plotTitle = zh ? `${standard} 女童生长曲线` : `${standard} girls’ growth chart`;
  const split = standard === 'WHO' && metric === 'length_cm' ? days.indexOf(731) : -1;
  return <section className="baby-panel">
    <svg viewBox="0 0 421 260" className="growth-plot" role="img" aria-label={`${plotTitle} · ${label} (${unit}) · P10–P100`}>
      <defs><clipPath id={clipId}><rect x="47" y="27" width="337" height="187" /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        {days.length > 1 && [...curves, days.map((_, i) => Math.max(upper, curves.at(-1)[i]))].map((top, index) => {
          const bottom = curves[index - 1] || days.map((_, i) => Math.min(lower, curves[0][i]));
          const segments = split < 0 ? [[0, days.length]] : [[0, split], [split, days.length]];
          return segments.map(([start, end]) => {
            const edge = values => days.slice(start, end).map((day, i) => `${x(day)},${y(values[start + i])}`);
            return <polygon key={`${index}-${start}`} points={[...edge(top), ...edge(bottom).reverse()].join(' ')}
              fill="#e7ddf8" stroke="white" strokeWidth="1" />;
          });
        })}
      </g>
      <path d="M47 27V214H384" fill="none" stroke="#77717f" />
      <text x="47" y="17">{label} ({unit})</text>
      {Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, i) => lower + i * step).map(value =>
        <text key={value} x="41" y={y(value) + 3} textAnchor="end">{Number(value.toPrecision(6))}</text>
      )}
      {Array.from({ length: Math.floor((lastDay - firstDay) / dayStep) + 1 }, (_, i) => firstDay + i * dayStep).map(day =>
        <text key={day} x={x(day)} y="231" textAnchor="middle">{day}</text>
      )}
      <text x="215" y="252" textAnchor="middle">{zh ? '日龄（天）' : 'Age (days)'}</text>
      <polyline points={points.map(({ day, value }) => `${x(day)},${y(value)}`).join(' ')} fill="none" stroke="#34333b" strokeWidth="1.5" />
      {points.map(({ id, day, value, date }) => <circle key={id} cx={x(day)} cy={y(value)} r="3.7" fill="#34333b" stroke="white"><title>{`${formatAppDate(date, language)}: ${Number(value.toFixed(2))} ${unit}`}</title></circle>)}
    </svg>
  </section>;
}

function rankLabel(rank) {
  return rank === null ? null : `P${Math.round(rank)}`;
}

function ageLabel(date) {
  const days = ageInDays(date);
  return days >= 0 ? `${Math.floor(days / 7)}w${days % 7}d` : null;
}

export function GrowthChart({ language, userId }) {
  const zh = language === 'zh';
  const [metric, setMetric] = useState(fields[0][0]);
  const [standard, setStandard] = useState('WHO');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error: failure } = supabase
          ? await supabase.from('baby_growth_records').select('id, measured_on, weight_kg, length_cm, head_cm').eq('user_id', userId).order('measured_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
          : { data: JSON.parse(localStorage.getItem(storageKey) || '[]') };
        if (failure) throw failure;
        if (active) setRecords(data);
      } catch {
        if (active) setError('load');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [userId]);

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const values = { measured_on: form.get('measured_on') || null };
    for (const [key] of fields) {
      const unit = form.get(key + '_unit');
      const input = form.get(key);
      const ounces = unit === 'lb+oz' ? form.get('weight_oz') : '';
      const value = unit === 'lb+oz' ? Number(input) + Number(ounces) / 16 : Number(input);
      if ((input || ounces) && (!Number.isFinite(value) || value <= 0)) {
        setError('invalid');
        return;
      }
      values[key] = input || ounces ? value * unitFactors[unit === 'lb+oz' ? 'lb' : unit] : null;
    }
    if (fields.every(([key]) => values[key] === null)) {
      setError('empty');
      return;
    }

    const record = { id: editing.id || crypto.randomUUID(), ...values };
    const isUpdate = Boolean(editing.id);
    setSaving(true);
    setError(null);
    try {
      if (supabase) {
        const table = supabase.from('baby_growth_records');
        const { error: failure } = isUpdate
          ? await table.update(values).eq('id', record.id).eq('user_id', userId).select('id').single()
          : await table.insert({ ...record, user_id: userId });
        if (failure) throw failure;
      } else {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (isUpdate && !stored.some(item => item.id === record.id)) throw new Error('Record no longer exists');
        localStorage.setItem(storageKey, JSON.stringify(isUpdate ? stored.map(item => item.id === record.id ? record : item) : [record, ...stored]));
      }
      setRecords(previous => isUpdate ? previous.map(item => item.id === record.id ? record : item) : [record, ...previous]);
      setEditing(null);
    } catch {
      setError('save');
    } finally {
      setSaving(false);
    }
  }

  const errors = {
    load: zh ? '无法读取生长记录。' : 'Could not load growth records.',
    save: zh ? '保存失败，请重试。' : 'Could not save. Please try again.',
    invalid: zh ? '测量值必须大于零。' : 'Measurements must be greater than zero.',
    empty: zh ? '请至少填写一项测量值。' : 'Enter at least one measurement.',
  };
  const sortedRecords = records.filter(record => record[metric] != null).sort((a, b) => (b.measured_on || '').localeCompare(a.measured_on || ''));
  const unit = fields.find(([key]) => key === metric)[3];
  return <BabyPage title={zh ? '生长曲线' : 'Growth chart'} language={language}>
    <div className="growth-toolbar">
      <Dialog open={Boolean(editing)} onOpenChange={open => {
        if (saving) return;
        setEditing(open ? {} : null);
        if (!open) setError(null);
      }}>
        <DialogTrigger asChild><Button disabled={loading || error === 'load'}><Plus size={17} aria-hidden="true" />{zh ? '记录' : 'Record'}</Button></DialogTrigger>
        <DialogContent className="activity-sheet-content growth-sheet" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editing?.id ? (zh ? '编辑生长记录' : 'Edit growth record') : (zh ? '新建生长记录' : 'New growth record')}</DialogTitle></DialogHeader>
          <form className="growth-form" onSubmit={save}>
            <MeasurementDateInput zh={zh} initialDate={editing?.measured_on || ''} />
            {fields.map(field => <MeasurementInput key={field[0]} field={field} zh={zh} value={editing?.[field[0]]} />)}
            {error && <p role="alert">{errors[error]}</p>}
            <div className="growth-actions">
              <Button type="submit" disabled={saving}>{zh ? '保存' : 'Save'}</Button>
              <Button type="button" variant="outline" disabled={saving} onClick={() => { setEditing(null); setError(null); }}>{zh ? '取消' : 'Cancel'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <div className="growth-segments" role="group" aria-label={zh ? '生长标准' : 'Growth reference'}>
        {['WHO', 'CDC'].map(option => <button type="button" key={option} aria-pressed={option === standard} onClick={() => setStandard(option)}>{option}</button>)}
      </div>
    </div>
    <div className="growth-tabs" role="tablist" aria-label={zh ? '测量项目' : 'Measurement'}>
      {fields.map(([key, english, chinese], index) => <button key={key} id={`growth-tab-${key}`} type="button" role="tab" aria-selected={key === metric} aria-controls="growth-tabpanel" tabIndex={key === metric ? 0 : -1} onClick={() => setMetric(key)} onKeyDown={event => {
        const offsets = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: fields.length - 1 - index };
        if (!Object.hasOwn(offsets, event.key)) return;
        event.preventDefault();
        const next = fields[(index + offsets[event.key] + fields.length) % fields.length][0];
        setMetric(next);
        document.getElementById(`growth-tab-${next}`).focus();
      }}>{zh ? chinese : english}</button>)}
    </div>
    {error === 'load' && <p role="alert">{errors.load}</p>}
    <div className="growth-results" id="growth-tabpanel" role="tabpanel" aria-labelledby={`growth-tab-${metric}`}>
      <GrowthPlot records={sortedRecords} language={language} standard={standard} metric={metric} />
      <section className="quick-section" aria-label={zh ? '历史记录' : 'Measurement history'}>
        <div className="activity-list growth-history">
          {loading && <p>{zh ? '正在加载…' : 'Loading…'}</p>}
          {!loading && !sortedRecords.length && error !== 'load' && <p>{zh ? '暂无生长记录' : 'No growth records yet'}</p>}
          {sortedRecords.map(record => {
            const day = record.measured_on;
            const rank = rankLabel(percentile(metric, record[metric], day, standard));
            const detail = [rank, ageLabel(day)].filter(Boolean).join(' • ');
            return <button type="button" key={record.id} className="activity-row" onClick={() => { setError(null); setEditing(record); }}>
              <span className="activity-icon lavender"><ChartLine size={18} aria-hidden="true" /></span>
              <span className="activity-copy">
                <span className="activity-title"><strong>{Number(record[metric]).toFixed(2)}{unit}</strong></span>
                {detail && <span className="activity-detail">{detail}</span>}
              </span>
            </button>;
          })}
        </div>
      </section>
    </div>
  </BabyPage>;
}
