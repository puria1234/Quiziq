import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/router';

type QuizHistory = {
  id: string;
  title: string;
  topic: string;
  score: number;
  total: number;
  percent: number;
  settings: {
    count: number;
  };
  createdAt: any;
};

export default function History() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<QuizHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'quizHistory'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as QuizHistory[];
        setHistory(data);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  const handleClearAll = async () => {
    if (!user) return;
    setClearing(true);

    try {
      const quizHistoryRef = collection(db, 'users', user.uid, 'quizHistory');
      const querySnapshot = await getDocs(query(quizHistoryRef));
      const deletePromises = querySnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'users', user.uid, 'quizHistory', docSnapshot.id))
      );
      await Promise.all(deletePromises);
      setHistory([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear history:', error);
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
          Track your progress and review past quizzes.
        </p>
      </section>

      {showClearConfirm && (
        <Card variant="panel" className="p-6 border-red-500/30">
          <h3 className="font-semibold text-white mb-2">Clear All Quiz History?</h3>
          <p className="text-sm text-white/60 mb-4">
            This will permanently delete all your quiz history. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowClearConfirm(false)}
              disabled={clearing}
              className="flex-1"
            >
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
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} variant="panel" className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display text-xl font-semibold text-white">{item.title}</h3>
                      <span className={`badge ${item.percent >= 70 ? 'text-green-400' : item.percent >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {item.percent}%
                      </span>
                    </div>
                    <p className="text-sm text-white/70 mb-2">{item.topic}</p>
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span>{item.score}/{item.total} correct</span>
                      <span>•</span>
                      <span>{item.settings?.count || item.total} questions</span>
                      <span>•</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-glow via-flare to-sun">
                      <span className="text-2xl font-bold text-ink">{item.percent}%</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
