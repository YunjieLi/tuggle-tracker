import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from './ui/dialog';

const pad = value => String(value).padStart(2, '0');
const hours = Array.from({ length: 24 }, (_, index) => pad(index));
const minutes = Array.from({ length: 12 }, (_, index) => pad(index * 5));

function TimeColumn({ label, options, value, onChange }) {
  const list = useRef(null);
  const optionId = useId();
  useLayoutEffect(() => {
    const selected = list.current.querySelector('[aria-selected="true"]');
    if (selected) list.current.scrollTop = selected.offsetTop - list.current.firstElementChild.offsetTop;
  }, []);

  function select(index) {
    const item = list.current.children[index];
    list.current.scrollTop = item.offsetTop - list.current.firstElementChild.offsetTop;
    onChange(options[index]);
  }

  return <div className="clock-column">
    <div ref={list} className="clock-wheel" tabIndex={0} role="listbox" aria-label={label}
      aria-activedescendant={`${optionId}-${value}`}
      onScroll={event => {
        const wheel = event.currentTarget;
        const index = Math.round(wheel.scrollTop / wheel.firstElementChild.offsetHeight);
        if (options[index] !== undefined && options[index] !== value) onChange(options[index]);
      }}
      onKeyDown={event => {
        const index = options.indexOf(value);
        const next = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: options.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(Math.max(0, Math.min(next, options.length - 1)));
      }}>
      {options.map((option, index) => <div key={option} id={`${optionId}-${option}`} role="option" aria-selected={value === option}
        onClick={() => select(index)}>{option}</div>)}
    </div>
  </div>;
}

export function TimeInput({ value, onChange, required, language, label }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const zh = language === 'zh';
  const originalMinute = value?.split(':')[1];
  const minuteOptions = originalMinute && !minutes.includes(originalMinute)
    ? [...minutes, originalMinute].sort() : minutes;

  const selection = `${hour}:${minute}`;
  const selectedTime = selection === value ? selection : `${hour}:${pad(Math.floor(Number(minute) / 5) * 5)}`;

  function changeOpen(nextOpen) {
    if (nextOpen) {
      const [initialHour, initialMinute] = (value || '00:00').split(':');
      setHour(initialHour);
      setMinute(initialMinute);
    }
    setOpen(nextOpen);
  }

  function confirm(time) {
    if (time !== value) onChange(time);
    setOpen(false);
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>
      <button type="button" className="clock-input" aria-label={`${label} ${value || 'HH:MM'}`}>
        {value || 'HH:MM'} <Clock size={16} aria-hidden="true" />
      </button>
    </DialogTrigger>
    <DialogContent className="clock-picker-dialog" aria-describedby={undefined}>
      <DialogTitle className="sr-only">{label}</DialogTitle>
      <div className="clock-picker-options">
        <TimeColumn label={zh ? '小时' : 'Hour'} options={hours} value={hour} onChange={setHour} />
        <TimeColumn label={zh ? '分钟' : 'Minute'} options={minuteOptions} value={minute} onChange={setMinute} />
      </div>
      <DialogFooter>
        {!required && <Button variant="ghost" className="dialog-action-start" onClick={() => confirm('')}>{zh ? '清除' : 'Clear'}</Button>}
        <Button variant="outline" onClick={() => setOpen(false)}>{zh ? '取消' : 'Cancel'}</Button>
        <Button
          onClick={() => confirm(selectedTime)}>{zh ? '确定' : 'Done'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
