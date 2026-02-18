import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/router';

type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'mixed';

type QuizHistory = {
  id: string;
  title: string;
  topic: string;
  score: number;
  total: number;
  percent: number;
  settings?: {
    count?: number;
    mode?: 'topic' | 'studyGuide';
    questionType?: 'multiple-choice' | 'true-false';
    difficulty?: Difficulty;
  };
  analytics?: {
    averageResponseTime?: number;
    bestStreak?: number;
  };
  createdAt: unknown;
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  mixed: 'Mixed'
};

function toDate(timestamp: unknown) {
  if (!timestamp) return null;

  if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
    const fn = timestamp.toDate;
    if (typeof fn === 'function') {
      return fn() as Date;
    }
  }

  const parsed = new Date(timestamp as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function calculateStudyStreak(entries: QuizHistory[]) {
  const daySet = new Set(
    entries
      .map((entry) => {
        const date = toDate(entry.createdAt);
        if (!date) return null;
        date.setHours(0, 0, 0, 0);
        return date.toISOString().slice(0, 10);
      })
      .filter((value): value is string => Boolean(value))
  );

  if (!daySet.size) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const todayKey = cursor.toISOString().slice(0, 10);
  if (!daySet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayKey = cursor.toISOString().slice(0, 10);
    if (!daySet.has(yesterdayKey)) {
      return 0;
    }
  }

  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export default function History() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<QuizHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Difficulty>('all');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchHistory = async () => {
      try {
        const historyQuery = query(collection(db, 'users', user.uid, 'quizHistory'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(historyQuery);
        const data = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<QuizHistory, 'id'>)
        }));
        setHistory(data);
      } catch (fetchError) {
        console.error('Failed to load history:', fetchError);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [user, loading, router]);

  const filteredHistory = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();

    return history.filter((item) => {
      const searchable = `${item.title} ${item.topic}`.toLowerCase();
      const itemDifficulty = item.settings?.difficulty ?? 'mixed';

      if (queryText && !searchable.includes(queryText)) return false;
      if (difficultyFilter !== 'all' && itemDifficulty !== difficultyFilter) return false;

      return true;
    });
  }, [history, searchQuery, difficultyFilter]);

  const summary = useMemo(() => {
    if (!history.length) {
      return {
        totalQuizzes: 0,
        averagePercent: 0,
        bestPercent: 0,
        averagePace: 0,
        studyStreak: 0
      };
    }

    const averagePercent = Math.round(history.reduce((sum, item) => sum + item.percent, 0) / history.length);
    const bestPercent = Math.max(...history.map((item) => item.percent));
    const paceValues = history
      .map((item) => item.analytics?.averageResponseTime)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averagePace = paceValues.length
      ? Number((paceValues.reduce((sum, value) => sum + value, 0) / paceValues.length).toFixed(1))
      : 0;

    return {
      totalQuizzes: history.length,
      averagePercent,
      bestPercent,
      averagePace,
      studyStreak: calculateStudyStreak(history)
    };
  }, [history]);

  if (loading || !user) {
    return null;
  }

  const handleClearAll = async () => {
    if (!user) return;
    setClearing(true);

    try {
      const quizHistoryRef = collection(db, 'users', user.uid, 'quizHistory');
      const querySnapshot = await getDocs(query(quizHistoryRef));
      const deletePromises = querySnapshot.docs.map((docSnapshot) =>
        deleteDoc(doc(db, 'users', user.uid, 'quizHistory', docSnapshot.id))
      );
      await Promise.all(deletePromises);
      setHistory([]);
      setShowClearConfirm(false);
    } catch (clearError) {
      console.error('Failed to clear history:', clearError);
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (timestamp: unknown) => {
    const date = toDate(timestamp);
    if (!date) return 'Just now';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Your Progress</p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">Quiz History</h1>
          {history.length > 0 && !showClearConfirm && (
            <Button
              onClick={() => setShowClearConfirm(true)}
              className="bg-white/5 border-white/20 hover:bg-white/10 text-white/70 hover:text-white"
            >
              Clear All
            </Button>
          )}
        </div>
        <p className="max-w-2xl text-sm text-white/70">
          Track score trends and pace to see how your study strategy evolves.
        </p>
      </section>

      {history.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card variant="simple" className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Total Quizzes</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.totalQuizzes}</p>
          </Card>
          <Card variant="simple" className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Average Score</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.averagePercent}%</p>
          </Card>
          <Card variant="simple" className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Best Score</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.bestPercent}%</p>
          </Card>
          <Card variant="simple" className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Study Streak</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.studyStreak} days</p>
          </Card>
          <Card variant="simple" className="p-4 sm:col-span-2 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Average Pace</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {summary.averagePace > 0 ? `${summary.averagePace}s / question` : 'Not enough data'}
            </p>
          </Card>
        </section>
      )}

      {showClearConfirm && (
        <Card variant="panel" className="p-6 border-red-500/30">
          <h3 className="font-semibold text-white mb-2">Clear All Quiz History?</h3>
          <p className="text-sm text-white/60 mb-4">
            This will permanently delete all your quiz history. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setShowClearConfirm(false)} disabled={clearing} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleClearAll}
              disabled={clearing}
              className="flex-1 bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-400"
            >
              {clearing ? 'Clearing...' : 'Clear All History'}
            </Button>
          </div>
        </Card>
      )}

      <section>
        {loadingHistory ? (
          <Card variant="panel" className="p-8 text-center">
            <p className="text-white/50">Loading your quiz history...</p>
          </Card>
        ) : history.length === 0 ? (
          <Card variant="panel" className="p-8 text-center">
            <p className="text-white/50">No quiz history yet. Take a quiz to see your progress here!</p>
          </Card>
        ) : (
          <>
            <Card variant="panel" className="mb-4 p-4 sm:p-6">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title or topic"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
                <select
                  value={difficultyFilter}
                  onChange={(event) => setDifficultyFilter(event.target.value as 'all' | Difficulty)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
                >
                  <option value="all" className="text-ink">All Difficulties</option>
                  <option value="beginner" className="text-ink">Beginner</option>
                  <option value="intermediate" className="text-ink">Intermediate</option>
                  <option value="advanced" className="text-ink">Advanced</option>
                  <option value="mixed" className="text-ink">Mixed</option>
                </select>
              </div>
            </Card>

            {filteredHistory.length === 0 ? (
              <Card variant="panel" className="p-8 text-center">
                <p className="text-white/50">No quiz sessions match your filters.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((item) => {
                  const difficulty = item.settings?.difficulty ?? 'mixed';
                  const questionType = item.settings?.questionType ?? 'multiple-choice';
                  const pace = item.analytics?.averageResponseTime;
                  const streak = item.analytics?.bestStreak;
                  const topicPreview =
                    item.topic && item.topic.length > 180 ? `${item.topic.slice(0, 177)}...` : item.topic;

                  return (
                    <Card key={item.id} variant="panel" className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="font-display text-xl font-semibold text-white">{item.title}</h3>
                            <span className={`badge ${item.percent >= 70 ? 'text-green-400' : item.percent >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {item.percent}%
                            </span>
                          </div>
                          <p className="text-sm text-white/70 mb-3">{topicPreview}</p>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                            <span className="rounded-full border border-white/15 px-3 py-1">{item.score}/{item.total} correct</span>
                            <span className="rounded-full border border-white/15 px-3 py-1">{item.settings?.count || item.total} questions</span>
                            <span className="rounded-full border border-white/15 px-3 py-1">{DIFFICULTY_LABELS[difficulty]}</span>
                            <span className="rounded-full border border-white/15 px-3 py-1">{questionType === 'multiple-choice' ? 'MCQ' : 'True/False'}</span>
                            {typeof pace === 'number' && <span className="rounded-full border border-white/15 px-3 py-1">{pace}s pace</span>}
                            {typeof streak === 'number' && <span className="rounded-full border border-white/15 px-3 py-1">Best streak {streak}</span>}
                          </div>

                          <div className="mt-3 text-xs text-white/50">{formatDate(item.createdAt)}</div>
                        </div>

                        <div className="flex-shrink-0">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-glow via-flare to-sun">
                            <span className="text-2xl font-bold text-ink">{item.percent}%</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
