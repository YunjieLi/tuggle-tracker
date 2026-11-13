import React, { useLayoutEffect, useRef } from 'react';
import { BabyPage } from './BabyPages';
import { localDateValue } from '../lib/dates';

const HISTORY_DAYS = 30;
const VISIBLE_DAYS = 7;

function milkAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function recentDays(today, range) {
  const days = new Map();
  for (let offset = range - 1; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    days.set(localDateValue(date), { date, breastmilk: 0, formula: 0, feedTimes: [] });
  }

  return days;
}

function recentMilkTotals(activities, today, range) {
  const days = recentDays(today, range);
  for (const activity of activities) {
    if (activity.kind !== 'feed') continue;
    const day = days.get(localDateValue(new Date(activity.at)));
    if (!day) continue;
    day.breastmilk += milkAmount(activity.breastmilkAmount);
    day.formula += milkAmount(activity.formulaAmount);
  }

  return Array.from(days.values(), day => ({ ...day, total: day.breastmilk + day.formula }));
}

export function FeedingReport({ language, activities, loading, error }) {
  const chartRef = useRef(null);
  const zh = language === 'zh';
  const locale = zh ? 'zh-CN' : 'en-US';
  const formatAmount = new Intl.NumberFormat(locale).format;
  const formatDate = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format;
  const labels = {
    title: zh ? '数据简报' : 'Data report',
    heading: zh ? '每日奶量' : 'Daily milk intake',
    breastmilk: zh ? '母乳' : 'Breastmilk',
    formula: zh ? '配方奶' : 'Formula',
    total: zh ? '总奶量' : 'Total',
    date: zh ? '日期' : 'Date',
  };
  const days = recentMilkTotals(activities, new Date(), HISTORY_DAYS);
  const maxTotal = Math.max(...days.map(day => day.total));
  const hasChart = !loading && maxTotal > 0;

  useLayoutEffect(() => {
    if (chartRef.current) chartRef.current.scrollLeft = chartRef.current.scrollWidth;
  }, [hasChart, error]);

  return <BabyPage title={labels.title} language={language}>
    <section className="baby-panel feeding-report" aria-labelledby="feeding-report-heading">
      <div className="feeding-report-header">
        <h2 id="feeding-report-heading">{labels.heading}</h2>
      </div>
      {error ? <p role="alert">{zh ? '无法加载奶量记录。' : 'Could not load milk intake records.'}</p> : loading ? <p role="status">{zh ? '正在加载…' : 'Loading…'}</p> : maxTotal === 0 ?
        <p>{zh ? `最近 ${HISTORY_DAYS} 天暂无奶量记录。` : `No milk amounts recorded in the last ${HISTORY_DAYS} days.`}</p> :
        <>
          <div className="feeding-legend" aria-hidden="true">
            <span><i className="feeding-breastmilk" />{labels.breastmilk}</span>
            <span><i className="feeding-formula" />{labels.formula}</span>
          </div>
          <div ref={chartRef} className="feeding-chart-scroll" tabIndex={0} role="region"
            aria-label={zh ? '奶量图表，可横向滚动' : 'Milk intake chart, scroll horizontally'}>
            <div className="feeding-chart" aria-hidden="true">
              {days.map(({ date, breastmilk, formula, total }) => <div className="feeding-chart-day" key={localDateValue(date)}>
                <div className="feeding-bar-track">
                  {total > 0 && <div className="feeding-bar" style={{ height: `${total / maxTotal * 100}%` }}>
                    <strong>{formatAmount(total)}</strong>
                    <div className="feeding-formula" style={{ height: `${formula / total * 100}%` }} />
                    <div className="feeding-breastmilk" style={{ height: `${breastmilk / total * 100}%` }} />
                  </div>}
                </div>
                <span>{formatDate(date)}</span>
              </div>)}
            </div>
          </div>
          <table className="feeding-table" aria-labelledby="feeding-report-heading">
            <thead><tr>{[labels.date, labels.breastmilk, labels.formula, labels.total].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>
              {days.slice(-VISIBLE_DAYS).reverse().map(({ date, breastmilk, formula, total }) => <tr key={localDateValue(date)}>
                <th scope="row"><time dateTime={localDateValue(date)}>{formatDate(date)}</time></th>
                <td>{formatAmount(breastmilk)}</td>
                <td>{formatAmount(formula)}</td>
                <td><strong>{formatAmount(total)}</strong></td>
              </tr>)}
            </tbody>
          </table>
        </>}
    </section>
    <FeedingTimes language={language} activities={activities} loading={loading} error={error} />
  </BabyPage>;
}


const clockLabel = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const CHART_START_HOUR = 14;
const CHART_START_MINUTE = CHART_START_HOUR * 60;
const DAY_MINUTES = 24 * 60;
const AXIS_STEP_MINUTES = 2 * 60;
const axisTicks = Array.from({ length: DAY_MINUTES / AXIS_STEP_MINUTES + 1 }, (_, index) => index * AXIS_STEP_MINUTES);

function FeedingTimes({ language, activities, loading, error }) {
  const chartRef = useRef(null);
  const zh = language === 'zh';
  const currentColumn = new Date();
  if (currentColumn.getHours() < CHART_START_HOUR) currentColumn.setDate(currentColumn.getDate() - 1);
  const days = recentDays(currentColumn, HISTORY_DAYS);
  for (const activity of activities) {
    if (activity.kind !== 'feed') continue;
    const at = new Date(activity.at);
    const minute = at.getHours() * 60 + at.getMinutes();
    if (minute < CHART_START_MINUTE) at.setDate(at.getDate() - 1);
    days.get(localDateValue(at))?.feedTimes.push((minute - CHART_START_MINUTE + DAY_MINUTES) % DAY_MINUTES);
  }
  const hasRecords = [...days.values()].some(day => day.feedTimes.length);
  const showChart = !error && !loading && hasRecords;
  useLayoutEffect(() => {
    if (chartRef.current) chartRef.current.scrollLeft = chartRef.current.scrollWidth;
  }, [showChart]);

  return <section className="baby-panel feeding-report" aria-labelledby="feeding-times-heading">
    <div className="feeding-report-header">
      <h2 id="feeding-times-heading">{zh ? '喂奶时间' : 'Feeding times'}</h2>
    </div>
    {error ? <p role="alert">{zh ? '无法加载喂奶记录。' : 'Could not load feeding records.'}</p>
      : loading ? <p role="status">{zh ? '正在加载…' : 'Loading…'}</p>
      : !hasRecords ? <p>{zh ? `最近 ${HISTORY_DAYS} 天暂无喂奶记录。` : `No feeds recorded in the last ${HISTORY_DAYS} days.`}</p>
      : <>
        <div className="feeding-time-layout">
          <div className="feeding-time-axis" aria-hidden="true">
            {axisTicks.map(minute => <span key={minute}
              style={{ top: `${minute / DAY_MINUTES * 100}%` }}>{String((minute + CHART_START_MINUTE) % DAY_MINUTES / 60).padStart(2, '0')}</span>)}
          </div>
          <div className="feeding-chart-scroll" ref={chartRef} tabIndex={0} role="region"
            aria-label={zh ? '喂奶时间图' : 'Feeding time chart'}>
            <div className="feeding-chart feeding-time-grid">
              {[...days].map(([date, { date: day, feedTimes }]) => {
                const label = `${day.getMonth() + 1}/${day.getDate()}`;
                const times = [...feedTimes].sort((a, b) => a - b).map(offset => {
                  const minute = offset + CHART_START_MINUTE;
                  const time = clockLabel(minute % DAY_MINUTES);
                  return minute < DAY_MINUTES ? time : (zh ? `次日 ${time}` : `Next day ${time}`);
                });
                return <div className="feeding-chart-day" key={date} role="img"
                  aria-label={`${label}: ${times.join(', ') || (zh ? '无记录' : 'No records')}`}
                  title={times.join(', ') || undefined}>
                  <div className="feeding-time-track" aria-hidden="true">
                    {feedTimes.map((offset, index) => {
                      const hour = ((offset + CHART_START_MINUTE) % DAY_MINUTES) / 60;
                      const isNight = hour >= 20 || hour < 8;
                      return <i key={index} className={isNight ? 'feeding-time-night-marker' : undefined}
                        style={{ top: `${offset / DAY_MINUTES * 100}%` }} />;
                    })}
                  </div>
                  <time dateTime={date} aria-hidden="true">{label}</time>
                </div>;
              })}
            </div>
          </div>
        </div>
      </>}
  </section>;
}
