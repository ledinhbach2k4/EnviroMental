import api from '../utils/api';

/**
 * Mood entry data model reflecting backend schema
 */
export interface MoodEntry {
  id: string;
  userId?: string;
  moodLevel: number; // 1-5 API scale (1: Very Sad to 5: Very Happy)
  note?: string | null;
  factors: string[];
  source?: string;
  createdAt: string;
}

/**
 * Payload required to log a new mood entry
 */
export interface CreateMoodEntryPayload {
  moodLevel: number; // 1-5 integer
  note?: string;
  factors?: string[];
  source?: string;
}

/**
 * Today's aggregated mood summary entry
 */
export interface TodaysMoodSummary {
  time: string;
  moodLevel: number;
}

/**
 * Fetch all historical mood entries for the authenticated user.
 * Utilizes 5-second request deduplication and 429 exponential backoff retry via api client.
 *
 * @param token - Clerk JWT authorization token
 * @returns Promise resolving to an array of MoodEntry records
 */
export async function fetchMoodEntries(token: string): Promise<MoodEntry[]> {
  const response = await api.get<MoodEntry[]>('/moods', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

/**
 * Fetch mood entries recorded today for the authenticated user.
 *
 * @param token - Clerk JWT authorization token
 * @returns Promise resolving to an array of today's mood items
 */
export async function fetchTodaysMoods(token: string): Promise<TodaysMoodSummary[]> {
  const response = await api.get<TodaysMoodSummary[]>('/moods/today', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

/**
 * Submit a new mood log entry.
 * Retries on HTTP 429 rate limit responses with exponential backoff.
 *
 * @param token - Clerk JWT authorization token
 * @param payload - Mood entry payload (moodLevel, note, factors, source)
 * @returns Promise resolving to the newly created MoodEntry record
 */
export async function createMoodEntry(
  token: string,
  payload: CreateMoodEntryPayload
): Promise<MoodEntry> {
  const response = await api.post<MoodEntry>('/moods', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}
