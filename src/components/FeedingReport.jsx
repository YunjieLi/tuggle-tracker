import React from 'react';
import { BabyPage } from './BabyPages';
import { localDateValue } from '../lib/dates';

function milkAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function recentMilkTotals(activities, today) {
  const days = new Map();
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    days.set(localDateValue(date), { date, breastmilk: 0, formula: 0 });
  }

  for (const activity of activities) {
    if (activity.kind !== 'feed') continue;
    const day = days.get(localDateValue(new Date(activity.at)));
    if (!day) continue;
    day.breastmilk += milkAmount(activity.breastmilkAmount);
    day.formula += milkAmount(activity.formulaAmount);
  }

  return Array.from(days.values(), day => ({ ...day, total: day.breastmilk + day.formula }));
}

export function FeedingReport({ language, activities, loading }) {
  const zh = language === 'zh';
  const locale = zh ? 'zh-CN' : 'en-US';
  const formatAmount = new Intl.NumberFormat(locale).format;
  const formatDate = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format;
  const labels = {
    title: zh ? '数据简报' : 'Data report',
    heading: zh ? '最近 7 天奶量（ml）' : 'Milk intake over the last 7 days (ml)',
    breastmilk: zh ? '母乳' : 'Breastmilk',
    formula: zh ? '配方奶' : 'Formula',
    total: zh ? '总奶量' : 'Total',
    date: zh ? '日期' : 'Date',
  };
  const days = recentMilkTotals(activities, new Date());
  const maxTotal = Math.max(...days.map(day => day.total));

  return <BabyPage title={labels.title} language={language}>
    <section className="baby-panel feeding-report" aria-labelledby="feeding-report-heading">
      <h2 id="feeding-report-heading">{labels.heading}</h2>
      {loading ? <p role="status">{zh ? '正在加载…' : 'Loading…'}</p> : maxTotal === 0 ?
        <p>{zh ? '最近 7 天暂无奶量记录。' : 'No milk amounts recorded in the last 7 days.'}</p> :
        <>
          <div className="feeding-legend" aria-hidden="true">
            <span><i className="feeding-breastmilk" />{labels.breastmilk}</span>
            <span><i className="feeding-formula" />{labels.formula}</span>
          </div>
          <div className="feeding-chart" aria-hidden="true">
            {days.map(({ date, breastmilk, formula, total }) => <div className="feeding-chart-day" key={localDateValue(date)}>
              <div className="feeding-bar-track">
                <div className="feeding-bar" style={{ height: `${total / maxTotal * 100}%` }}>
                  <strong>{formatAmount(total)}</strong>
                  {total > 0 && <>
                    <div className="feeding-formula" style={{ height: `${formula / total * 100}%` }} />
                    <div className="feeding-breastmilk" style={{ height: `${breastmilk / total * 100}%` }} />
                  </>}
                </div>
              </div>
              <span>{formatDate(date)}</span>
            </div>)}
          </div>
          <table className="feeding-table" aria-labelledby="feeding-report-heading">
            <thead><tr>{[labels.date, labels.breastmilk, labels.formula, labels.total].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>
              {[...days].reverse().map(({ date, breastmilk, formula, total }) => <tr key={localDateValue(date)}>
                <th scope="row"><time dateTime={localDateValue(date)}>{formatDate(date)}</time></th>
                <td>{formatAmount(breastmilk)}</td>
                <td>{formatAmount(formula)}</td>
                <td><strong>{formatAmount(total)}</strong></td>
              </tr>)}
            </tbody>
          </table>
          <p>{zh ? '按本地日期汇总喂奶记录中填写的奶量，未记录奶量的亲喂不计入。' : 'Amounts are grouped by local date. Nursing without a recorded volume is excluded.'}</p>
        </>}
    </section>
  </BabyPage>;
}
