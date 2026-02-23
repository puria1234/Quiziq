import { createHash } from 'crypto';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

interface RateLimitData {
  dailyCount: number;
  lastDailyReset: string; // ISO date string (YYYY-MM-DD, UTC)
}

type RateLimitStatus = {
  daily: number;
  dailyLimit: number;
};

const DAILY_LIMIT = 5;

function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

function toRateLimitDocId(ipAddress: string) {
  const hash = createHash('sha256').update(ipAddress).digest('hex');
  return `ip_${hash}`;
}

export async function checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; reason?: string; remaining?: RateLimitStatus }> {
  const today = getTodayUTC();
  const rateLimitRef = doc(db, 'rateLimits', toRateLimitDocId(ipAddress));
  const rateLimitDoc = await getDoc(rateLimitRef);

  if (!rateLimitDoc.exists()) {
    await setDoc(rateLimitRef, {
      dailyCount: 1,
      lastDailyReset: today
    });

    return {
      allowed: true,
      remaining: {
        daily: DAILY_LIMIT - 1,
        dailyLimit: DAILY_LIMIT
      }
    };
  }

  const data = rateLimitDoc.data() as Partial<RateLimitData>;
  let dailyCount = typeof data.dailyCount === 'number' ? data.dailyCount : 0;
  let lastDailyReset = typeof data.lastDailyReset === 'string' ? data.lastDailyReset : today;

  if (lastDailyReset !== today) {
    dailyCount = 0;
    lastDailyReset = today;
  }

  if (dailyCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      reason: `Daily limit of ${DAILY_LIMIT} quiz generations per IP address exceeded. Resets at midnight UTC.`
    };
  }

  await updateDoc(rateLimitRef, {
    dailyCount: dailyCount + 1,
    lastDailyReset
  });

  return {
    allowed: true,
    remaining: {
      daily: DAILY_LIMIT - (dailyCount + 1),
      dailyLimit: DAILY_LIMIT
    }
  };
}

export async function getRateLimitStatus(ipAddress: string): Promise<RateLimitStatus> {
  const today = getTodayUTC();
  const rateLimitRef = doc(db, 'rateLimits', toRateLimitDocId(ipAddress));
  const rateLimitDoc = await getDoc(rateLimitRef);

  if (!rateLimitDoc.exists()) {
    return {
      daily: DAILY_LIMIT,
      dailyLimit: DAILY_LIMIT
    };
  }

  const data = rateLimitDoc.data() as Partial<RateLimitData>;
  const dailyCount = data.lastDailyReset === today && typeof data.dailyCount === 'number' ? data.dailyCount : 0;

  return {
    daily: Math.max(0, DAILY_LIMIT - dailyCount),
    dailyLimit: DAILY_LIMIT
  };
}
