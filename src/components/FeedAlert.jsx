import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const MINUTE = 60_000;
const THREE_HOURS = 180 * MINUTE;

export function FeedAlert({ feeds, language }) {
  const [now, setNow] = useState(Date.now);
  const hasFeeds = feeds.length > 0;

  useEffect(() => {
    if (!hasFeeds) return undefined;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [hasFeeds]);

  const latestFeed = feeds.find(feed => Date.parse(feed.at) <= now);
  if (!latestFeed) return null;

  const lastFedAt = Date.parse(latestFeed.at);
  const minutes = Math.floor((now - lastFedAt) / MINUTE);
  const elapsed = minutes < 60 ? `${minutes}min` : `${Math.floor(minutes / 60)}h${minutes % 60}min`;
  const milestone = new Date(lastFedAt + THREE_HOURS);
  const time = `${String(milestone.getHours()).padStart(2, '0')}:${String(milestone.getMinutes()).padStart(2, '0')}`;
  const reached = now >= milestone.getTime();

  return <p className="feed-alert event-feed">
    <Clock size={17} aria-hidden="true" />
    <span>{language === 'zh' ? <>
      距离上次喂奶 <strong>{elapsed}</strong>，{reached ? '已满三小时。' : <><strong>{time}</strong> 将满三小时。</>}
    </> : <>
      Last fed <strong>{elapsed}</strong> ago. {reached ? 'Three hours have passed.' : <>Three hours at <strong>{time}</strong>.</>}
    </>}</span>
  </p>;
}
