import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

interface RateLimitData {
  dailyCount: number;
  monthlyCount: number;
  lastDailyReset: string; // ISO date string (YYYY-MM-DD)
  lastMonthlyReset: string; // ISO date string (YYYY-MM)
}

const DAILY_LIMIT = 20;
const MONTHLY_LIMIT = 100;

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: { daily: number; monthly: number } }> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const rateLimitRef = doc(db, 'rateLimits', userId);
  const rateLimitDoc = await getDoc(rateLimitRef);

  if (!rateLimitDoc.exists()) {
    // First request - initialize
    await setDoc(rateLimitRef, {
      dailyCount: 1,
      monthlyCount: 1,
      lastDailyReset: today,
      lastMonthlyReset: thisMonth
    });

    return {
      allowed: true,
      remaining: {
        daily: DAILY_LIMIT - 1,
        monthly: MONTHLY_LIMIT - 1
      }
    };
  }

  const data = rateLimitDoc.data() as RateLimitData;
  let { dailyCount, monthlyCount, lastDailyReset, lastMonthlyReset } = data;

  // Reset daily count if it's a new day
  if (lastDailyReset !== today) {
    dailyCount = 0;
    lastDailyReset = today;
  }

  // Reset monthly count if it's a new month
  if (lastMonthlyReset !== thisMonth) {
    monthlyCount = 0;
    lastMonthlyReset = thisMonth;
  }

  // Check limits
  if (dailyCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      reason: `Daily limit of ${DAILY_LIMIT} requests exceeded. Resets at midnight.`
    };
  }

  if (monthlyCount >= MONTHLY_LIMIT) {
    return {
      allowed: false,
      reason: `Monthly limit of ${MONTHLY_LIMIT} requests exceeded. Resets next month.`
    };
  }

  // Increment counters
  await updateDoc(rateLimitRef, {
    dailyCount: dailyCount + 1,
    monthlyCount: monthlyCount + 1,
    lastDailyReset,
    lastMonthlyReset
  });

  return {
    allowed: true,
    remaining: {
      daily: DAILY_LIMIT - (dailyCount + 1),
      monthly: MONTHLY_LIMIT - (monthlyCount + 1)
    }
  };
}

export async function getRateLimitStatus(userId: string): Promise<{ daily: number; monthly: number; dailyLimit: number; monthlyLimit: number }> {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const rateLimitRef = doc(db, 'rateLimits', userId);
  const rateLimitDoc = await getDoc(rateLimitRef);

  if (!rateLimitDoc.exists()) {
    return {
      daily: DAILY_LIMIT,
      monthly: MONTHLY_LIMIT,
      dailyLimit: DAILY_LIMIT,
      monthlyLimit: MONTHLY_LIMIT
    };
  }

  const data = rateLimitDoc.data() as RateLimitData;
  let { dailyCount, monthlyCount, lastDailyReset, lastMonthlyReset } = data;

  // Reset if needed
  if (lastDailyReset !== today) {
    dailyCount = 0;
  }

  if (lastMonthlyReset !== thisMonth) {
    monthlyCount = 0;
  }

  return {
    daily: DAILY_LIMIT - dailyCount,
    monthly: MONTHLY_LIMIT - monthlyCount,
    dailyLimit: DAILY_LIMIT,
    monthlyLimit: MONTHLY_LIMIT
  };
}
