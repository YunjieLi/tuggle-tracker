import { activityFromRow, supabase } from './supabase';

export const ACTIVITY_PAGE_SIZE = 25;

export async function fetchActivityPage(userId, { cursor, since, kind, limit = ACTIVITY_PAGE_SIZE, signal } = {}) {
  let query = supabase.from('baby_activities').select('*').eq('user_id', userId)
    .order('occurred_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
  if (since) query = query.gte('occurred_at', since);
  if (kind) query = query.eq('kind', kind);
  if (cursor) {
    query = query.or(`occurred_at.lt.${cursor.at},and(occurred_at.eq.${cursor.at},id.lt.${cursor.id})`);
  }
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(activityFromRow);
}
