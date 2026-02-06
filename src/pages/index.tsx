import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user } = useAuth();
  const [displayText, setDisplayText] = useState('');
  const fullText = 'AI-powered quizzes.';
  const typingSpeed = 100; // milliseconds per character

  useEffect(() => {
    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(timer);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="badge">AI-Powered</span>
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl animate-fade-up">
          Master any subject with{' '}
          <span className="bg-gradient-to-br from-glow via-flare to-sun bg-clip-text text-transparent">
            {displayText}
          </span>
        </h1>
        <p className="max-w-2xl text-base sm:text-lg text-white/70 animate-fade-up animate-delay-1">
          Upload your notes, paste any topic, and let <span className="bg-gradient-to-br from-glow via-flare to-sun bg-clip-text text-transparent font-semibold">AI</span> generate personalized quizzes to help you study smarter and retain more.
        </p>
        <div className="flex flex-wrap items-center gap-3 animate-fade-up animate-delay-2">
          {user ? (
            <Button href="/dashboard" variant="primary">
              Go to App
            </Button>
          ) : (
            <>
              <Button href="/signup" variant="primary">
                Start Studying
              </Button>
              <Button href="/login" variant="ghost">
                Sign In
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up animate-delay-3">
        <Card variant="panel" className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">AI Quiz Generation</h2>
          <p className="mt-2 text-sm text-white/70">
            Paste your notes or enter any topic. Our AI creates tailored questions that target your weak spots.
          </p>
        </Card>
        <Card variant="panel" className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Instant Feedback</h2>
          <p className="mt-2 text-sm text-white/70">
            Get immediate explanations for every answer. Learn from your mistakes and reinforce correct knowledge.
          </p>
        </Card>
        <Card variant="panel" className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Any Subject</h2>
          <p className="mt-2 text-sm text-white/70">
            From science to history, math to languages. Quiziq adapts to whatever you need to study.
          </p>
        </Card>
      </section>

      <section>
        <Card variant="panel" className="p-5 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">How It Works</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">Study Smarter</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card variant="simple" className="p-4">
              <div className="flex flex-col items-center text-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-glow/20 text-glow font-bold text-lg">1</span>
                <div>
                  <p className="font-semibold">Enter Your Topic</p>
                  <p className="mt-1 text-sm text-white/50">Type a subject or paste your notes</p>
                </div>
              </div>
            </Card>
            <Card variant="simple" className="p-4">
              <div className="flex flex-col items-center text-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-flare/20 text-flare font-bold text-lg">2</span>
                <div>
                  <p className="font-semibold">Take the Quiz</p>
                  <p className="mt-1 text-sm text-white/50">Answer AI-generated questions</p>
                </div>
              </div>
            </Card>
            <Card variant="simple" className="p-4">
              <div className="flex flex-col items-center text-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sun/20 text-sun font-bold text-lg">3</span>
                <div>
                  <p className="font-semibold">Get Explanations</p>
                  <p className="mt-1 text-sm text-white/50">Learn from detailed feedback on each answer</p>
                </div>
              </div>
            </Card>
          </div>
        </Card>
      </section>

    </>
  );
}
