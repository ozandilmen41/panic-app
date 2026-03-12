import { getJson, setJson } from './storage';

export type BreathSessionStatus = 'in_progress' | 'completed' | 'interrupted';

export interface BreathSession {
  startedAt: string;
  endedAt?: string;
  status: BreathSessionStatus;
  acknowledged?: boolean;
}

export type DailySession = {
  time: string;
  status: Exclude<BreathSessionStatus, 'in_progress'>;
};

const LAST_SESSION_KEY = 'lastBreathSession';
const DAILY_STATS_KEY = 'breathDailyStats';

export type DailyStats = {
  completed: number;
  interrupted: number;
  sessions: DailySession[];
};

export type DailyStatsByDate = Record<string, DailyStats>;

async function getLastSession(): Promise<BreathSession | null> {
  return getJson<BreathSession>(LAST_SESSION_KEY);
}

async function setLastSession(session: BreathSession) {
  await setJson(LAST_SESSION_KEY, session);
}

function getTodayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

interface RawDailyStats {
  completed?: number;
  interrupted?: number;
  sessions?: { time?: string; status?: string }[];
}

async function getDailyStats(): Promise<DailyStatsByDate> {
  const raw = await getJson<Record<string, RawDailyStats>>(DAILY_STATS_KEY);
  const stats = raw ?? {};

  const normalized: DailyStatsByDate = {};

  Object.entries(stats).forEach(([date, value]) => {
    if (!value) return;

    const completed = typeof value.completed === 'number' ? value.completed : 0;
    const interrupted = typeof value.interrupted === 'number' ? value.interrupted : 0;

    const rawSessions = Array.isArray(value.sessions) ? value.sessions : [];

    const sessions: DailySession[] = rawSessions
      .map((s) => ({
        time: typeof s?.time === 'string' ? s.time : '',
        status: s?.status === 'interrupted' ? ('interrupted' as const) : ('completed' as const),
      }))
      .filter((s) => !!s.time);

    normalized[date] = {
      completed,
      interrupted,
      sessions,
    };
  });

  return normalized;
}

async function setDailyStats(stats: DailyStatsByDate) {
  await setJson(DAILY_STATS_KEY, stats);
}

async function incrementDailyStat(type: 'completed' | 'interrupted') {
  const key = getTodayKey();
  const stats = await getDailyStats();
  const current =
    stats[key] ?? {
      completed: 0,
      interrupted: 0,
      sessions: [],
    };

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;

  const updated: DailyStats = {
    ...current,
    [type]: current[type] + 1,
    sessions: [
      ...(current.sessions ?? []),
      {
        time,
        status: type,
      },
    ],
  };
  await setDailyStats({ ...stats, [key]: updated });
}

export async function startBreathSession() {
  const session: BreathSession = {
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    acknowledged: false,
  };
  await setLastSession(session);
}

export async function completeBreathSession() {
  const existing = await getLastSession();
  if (!existing) return;
  
  // Idempotency check: prevent duplicate recording
  if (existing.status === 'completed' || existing.status === 'interrupted') {
    return;
  }

  const session: BreathSession = {
    ...existing,
    endedAt: new Date().toISOString(),
    status: 'completed',
    acknowledged: true,
  };
  await setLastSession(session);
  await incrementDailyStat('completed');
}

export async function interruptBreathSession() {
  const existing = await getLastSession();
  if (!existing) return;
  
  // Idempotency check: prevent duplicate recording
  if (existing.status === 'completed' || existing.status === 'interrupted') {
    return;
  }

  const session: BreathSession = {
    ...existing,
    endedAt: new Date().toISOString(),
    status: 'interrupted',
    acknowledged: false,
  };
  await setLastSession(session);
  await incrementDailyStat('interrupted');
}

export async function hasPendingInterruptedSession(): Promise<boolean> {
  const session = await getLastSession();
  if (!session) return false;
  return session.status === 'interrupted' && !session.acknowledged;
}

export async function acknowledgeInterruptedSession() {
  const session = await getLastSession();
  if (!session) return;
  await setLastSession({ ...session, acknowledged: true });
}

export async function getAllDailyStats(): Promise<DailyStatsByDate> {
  return getDailyStats();
}

export async function getTotalStats(): Promise<DailyStats> {
  const stats = await getDailyStats();
  return Object.values(stats).reduce<DailyStats>(
    (acc, day) => ({
      completed: acc.completed + day.completed,
      interrupted: acc.interrupted + day.interrupted,
      sessions: [],
    }),
    { completed: 0, interrupted: 0, sessions: [] },
  );
}

