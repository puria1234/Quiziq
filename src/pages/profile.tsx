import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<
    {
      id: string;
      title: string;
      topic: string;
      score: number;
      total: number;
      percent: number;
      createdAt?: Timestamp;
      settings?: {
        count?: number;
      };
    }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    setHistoryLoading(true);
    const historyQuery = query(
      collection(db, 'users', user.uid, 'quizHistory'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as {
            title: string;
            topic: string;
            score: number;
            total: number;
            percent: number;
            createdAt?: Timestamp;
            settings?: {
              count?: number;
            };
          })
        }));
        setHistory(items);
        setHistoryLoading(false);
        setHistoryError(null);
      },
      () => {
        setHistoryError('Unable to load quiz history.');
        setHistoryLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'QZ';

  if (!user) return null;

  return (
    <>
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Profile</p>
        <h1 className="font-display text-4xl font-bold text-white md:text-5xl">Your Account</h1>
      </section>

      <section className="max-w-xl">
        <div className="gradient-panel rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-glow via-flare to-sun text-ink">
              <span className="font-display text-2xl font-bold">{initials}</span>
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.displayName || 'Student'}</p>
              <p className="text-sm text-white/50">{user?.email}</p>
            </div>
          </div>
          <div className="mt-6">
            <Button onClick={handleLogout} variant="ghost" className="w-full">
              Sign Out
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-4xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">History</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">Quiz History</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {historyLoading && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                Loading your recent quizzes...
              </div>
            )}
            {historyError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {historyError}
              </div>
            )}
            {!historyLoading && !historyError && history.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No quizzes yet. Generate one from the Study page to see it here.
              </div>
            )}
            {history.map((item) => {
              const dateLabel = item.createdAt
                ? item.createdAt.toDate().toLocaleDateString()
                : 'Recently';
              return (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-xs text-white/50">{item.topic || 'Custom notes'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-glow">{item.percent ?? Math.round((item.score / item.total) * 100)}%</p>
                      <p className="text-xs text-white/50">{dateLabel}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {item.score} / {item.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
