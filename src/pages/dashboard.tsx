import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties
} from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as Icons from 'lucide-react';

type Question = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

type Quiz = {
  title: string;
  questions: Question[];
};

type TrendingTopic = {
  id: string;
  title: string;
  category: string;
  icon: string;
};

type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'mixed';

type AnswerRecord = {
  selected: number | null;
  correct: number;
  timeSpent: number;
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  mixed: 'Mixed'
};

function getAverageTime(values: number[]) {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function getHintFromExplanation(explanation: string) {
  const normalized = explanation.replace(/\s+/g, ' ').trim();
  const firstSentence = normalized.match(/[^.!?]+[.!?]?/)?.[0] ?? normalized;
  if (firstSentence.length <= 180) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, 177)}...`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'topic' | 'studyGuide'>('topic');
  const [topic, setTopic] = useState('');
  const [studyGuide, setStudyGuide] = useState('');
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'true-false'>('multiple-choice');
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [numQuestions, setNumQuestions] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const hasSavedRef = useRef(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Unique gameplay state
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [hintText, setHintText] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [resultCopied, setResultCopied] = useState(false);
  const [rateLimitStatus, setRateLimitStatus] = useState<{ daily: number; monthly: number; dailyLimit: number; monthlyLimit: number } | null>(null);

  const averageResponseSeconds = useMemo(() => getAverageTime(responseTimes), [responseTimes]);

  useEffect(() => {
    const fetchRateLimitStatus = async () => {
      if (!user?.uid) return;
      try {
        const res = await fetch(`/api/rate-limit-status?userId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setRateLimitStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch rate limit status:', error);
      }
    };
    fetchRateLimitStatus();
  }, [user?.uid]);

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        const res = await fetch('/api/trending-topics');
        if (res.ok) {
          const data = (await res.json()) as { topics?: TrendingTopic[] };
          if (Array.isArray(data.topics)) {
            setTrendingTopics(data.topics);
          }
        }
      } catch (fetchError) {
        console.error('Failed to fetch trending topics:', fetchError);
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchTrendingTopics();
  }, []);

  const resetPerQuestionState = useCallback(() => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setEliminatedOptions([]);
    setHintText(null);
    setQuestionStartedAt(Date.now());
  }, []);

  const handleGenerateQuiz = async () => {
    const content = mode === 'topic' ? topic.trim() : studyGuide.trim();
    if (!content) return;

    const parsed = Number.parseInt(numQuestions, 10);
    if (!parsed || parsed < 3 || parsed > 20 || !Number.isInteger(parsed)) {
      setError('Please enter a whole number between 3 and 20');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSaveStatus('idle');
    hasSavedRef.current = false;

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          topic: mode === 'topic' ? topic.trim() : undefined,
          studyGuide: mode === 'studyGuide' ? studyGuide.trim() : undefined,
          questionType,
          difficulty,
          count: parsed,
          userId: user?.uid
        })
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string; rateLimitExceeded?: boolean };
        if (data.rateLimitExceeded) {
          throw new Error(data.error || 'Rate limit exceeded');
        }
        throw new Error(data.error || 'Failed to generate quiz');
      }

      const data = (await res.json()) as Quiz;
      setQuiz(data);
      setCurrentQuestion(0);
      setScore(0);
      setQuizComplete(false);
      
      // Update rate limit status after successful generation
      if (user?.uid) {
        const statusRes = await fetch(`/api/rate-limit-status?userId=${user.uid}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setRateLimitStatus(statusData);
        }
      }
      setAnswers([]);
      setResponseTimes([]);
      setCurrentStreak(0);
      setBestStreak(0);
      setFiftyFiftyUsed(false);
      setHintUsed(false);
      setPracticeMode(false);
      setResultCopied(false);
      resetPerQuestionState();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate quiz';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (showExplanation || eliminatedOptions.includes(index)) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = useCallback(
    (forcedSelection?: number | null) => {
      if (!quiz || showExplanation) return;

      const currentQ = quiz.questions[currentQuestion];
      if (!currentQ) return;

      const answerToUse = forcedSelection !== undefined ? forcedSelection : selectedAnswer;
      if (answerToUse === null || answerToUse === undefined) {
        return;
      }

      const elapsedSeconds = questionStartedAt
        ? Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000))
        : 0;

      const correct = currentQ.answerIndex;
      const isCorrect = answerToUse === correct;

      if (isCorrect) {
        setScore((prev) => prev + 1);
      }

      setCurrentStreak((prev) => {
        const nextStreak = isCorrect ? prev + 1 : 0;
        setBestStreak((best) => Math.max(best, nextStreak));
        return nextStreak;
      });

      setAnswers((prev) => [
        ...prev,
        {
          selected: answerToUse ?? null,
          correct,
          timeSpent: elapsedSeconds
        }
      ]);
      setResponseTimes((prev) => [...prev, elapsedSeconds]);
      setShowExplanation(true);
    },
    [quiz, currentQuestion, selectedAnswer, showExplanation, questionStartedAt]
  );

  const handleNextQuestion = useCallback(() => {
    if (!quiz) return;

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      resetPerQuestionState();
    } else {
      setQuizComplete(true);
    }
  }, [quiz, currentQuestion, resetPerQuestionState]);

  const handleRestartQuiz = () => {
    setQuiz(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizComplete(false);
    setAnswers([]);
    setMode('topic');
    setTopic('');
    setStudyGuide('');
    setQuestionType('multiple-choice');
    setDifficulty('mixed');
    setNumQuestions('10');
    setUploadedFileName(null);
    setCurrentStreak(0);
    setBestStreak(0);
    setResponseTimes([]);
    setFiftyFiftyUsed(false);
    setHintUsed(false);
    setEliminatedOptions([]);
    setHintText(null);
    setPracticeMode(false);
    setResultCopied(false);
    setQuestionStartedAt(null);
  };

  const handleUseFiftyFifty = () => {
    if (!quiz || showExplanation || fiftyFiftyUsed) return;

    const currentQ = quiz.questions[currentQuestion];
    if (!currentQ || currentQ.options.length < 4) return;

    const incorrectIndices = currentQ.options
      .map((_, index) => index)
      .filter((index) => index !== currentQ.answerIndex);
    const shuffledIncorrect = [...incorrectIndices].sort(() => Math.random() - 0.5);
    const toEliminate = shuffledIncorrect.slice(0, 2);

    setEliminatedOptions(toEliminate);
    setFiftyFiftyUsed(true);

    if (selectedAnswer !== null && toEliminate.includes(selectedAnswer)) {
      setSelectedAnswer(null);
    }
  };

  const handleUseHint = () => {
    if (!quiz || showExplanation || hintUsed) return;
    const currentQ = quiz.questions[currentQuestion];
    if (!currentQ) return;

    setHintText(getHintFromExplanation(currentQ.explanation));
    setHintUsed(true);
  };

  const handleRetryMissedQuestions = () => {
    if (!quiz) return;

    const missedQuestions = quiz.questions.filter((_, index) => {
      const answer = answers[index];
      return !answer || answer.selected !== answer.correct;
    });

    if (missedQuestions.length === 0) return;

    setQuiz({
      title: `${quiz.title} • Mistake Remix`,
      questions: missedQuestions
    });
    setPracticeMode(true);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizComplete(false);
    setAnswers([]);
    setCurrentStreak(0);
    setBestStreak(0);
    setResponseTimes([]);
    setFiftyFiftyUsed(false);
    setHintUsed(false);
    setEliminatedOptions([]);
    setHintText(null);
    setResultCopied(false);
    setQuestionStartedAt(Date.now());
  };

  const handleCopySummary = async () => {
    if (!quiz) return;

    const percentage = quiz.questions.length > 0 ? Math.round((score / quiz.questions.length) * 100) : 0;
    const summary = [
      `Quiziq Results: ${quiz.title}`,
      `Score: ${score}/${quiz.questions.length} (${percentage}%)`,
      `Difficulty: ${DIFFICULTY_LABELS[difficulty]}`,
      `Question Type: ${questionType === 'multiple-choice' ? 'Multiple Choice' : 'True / False'}`,
      `Best Streak: ${bestStreak}`,
      `Average Response Time: ${averageResponseSeconds.toFixed(1)}s`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setResultCopied(true);
      window.setTimeout(() => setResultCopied(false), 2200);
    } catch {
      setResultCopied(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setError(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let extractedText = '';

      if (fileExtension === 'txt') {
        extractedText = await file.text();
      } else if (fileExtension === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const textParts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i += 1) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ');
          textParts.push(pageText);
        }
        extractedText = textParts.join('\n\n');
      } else if (fileExtension === 'docx') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        throw new Error('Unsupported file type. Please upload .txt, .pdf, or .docx files.');
      }

      if (!extractedText.trim()) {
        throw new Error('No text could be extracted from the file.');
      }

      setStudyGuide(extractedText);
      setUploadedFileName(file.name);
      setMode('studyGuide');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process file';
      setError(message);
      setUploadedFileName(null);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearFile = () => {
    setUploadedFileName(null);
    setStudyGuide('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!quiz || quizComplete) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (showExplanation) {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleNextQuestion();
        }
        return;
      }

      if (/^[1-4]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const optionCount = quiz.questions[currentQuestion]?.options.length ?? 0;
        if (index < optionCount && !eliminatedOptions.includes(index)) {
          setSelectedAnswer(index);
        }
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmitAnswer();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quiz, quizComplete, showExplanation, currentQuestion, eliminatedOptions, handleSubmitAnswer, handleNextQuestion]);

  useEffect(() => {
    if (!quizComplete || !quiz || !user || hasSavedRef.current || practiceMode) return;

    const saveHistory = async () => {
      setSaveStatus('saving');
      try {
        const percentage = quiz.questions.length > 0 ? Math.round((score / quiz.questions.length) * 100) : 0;
        const content = mode === 'topic' ? topic.trim() : studyGuide.trim();
        const averageResponseTime = responseTimes.length
          ? Number(getAverageTime(responseTimes).toFixed(1))
          : 0;

        await addDoc(collection(db, 'users', user.uid, 'quizHistory'), {
          title: quiz.title,
          topic: content,
          score,
          total: quiz.questions.length,
          percent: percentage,
          settings: {
            count: Number.parseInt(numQuestions, 10) || quiz.questions.length,
            mode,
            questionType,
            difficulty
          },
          analytics: {
            averageResponseTime,
            bestStreak
          },
          createdAt: serverTimestamp()
        });
        hasSavedRef.current = true;
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    };

    saveHistory();
  }, [
    quizComplete,
    quiz,
    user,
    practiceMode,
    mode,
    topic,
    studyGuide,
    score,
    numQuestions,
    questionType,
    difficulty,
    responseTimes,
    bestStreak
  ]);

  // Quiz complete view
  if (quizComplete && quiz) {
    const percentage = quiz.questions.length > 0 ? Math.round((score / quiz.questions.length) * 100) : 0;
    const missedCount = answers.filter((item) => item.selected !== item.correct).length;

    return (
      <>
        <section className="flex flex-col gap-3 items-center text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Results</p>
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">Quiz Complete.</h1>
        </section>

        <section className="max-w-3xl mx-auto w-full">
          <Card variant="panel" className="p-4 sm:p-6 md:p-8">
            <div className="text-center mb-6">
              <p className="text-5xl sm:text-6xl font-bold text-glow">{percentage}%</p>
              <p className="mt-2 text-white/70">You got {score} out of {quiz.questions.length} correct</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                <span className="badge">{DIFFICULTY_LABELS[difficulty]}</span>
                <span className="badge">{questionType === 'multiple-choice' ? 'MCQ' : 'True/False'}</span>
                {practiceMode && <span className="badge">Mistake Remix</span>}
              </div>
            </div>

            {user && !practiceMode && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60 text-center">
                {saveStatus === 'saving' && 'Saving your quiz to history...'}
                {saveStatus === 'saved' && 'Saved to your quiz history.'}
                {saveStatus === 'error' && 'Could not save to history. Try again later.'}
              </div>
            )}

            {practiceMode && (
              <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 text-center">
                Mistake Remix sessions are practice-only and are not added to history.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Card variant="simple" className="p-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Avg Pace</p>
                <p className="mt-2 text-2xl font-semibold text-white">{averageResponseSeconds.toFixed(1)}s</p>
              </Card>
              <Card variant="simple" className="p-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Best Streak</p>
                <p className="mt-2 text-2xl font-semibold text-white">{bestStreak}</p>
              </Card>
              <Card variant="simple" className="p-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Missed</p>
                <p className="mt-2 text-2xl font-semibold text-white">{missedCount}</p>
              </Card>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleCopySummary} className="flex-1">
                {resultCopied ? 'Summary Copied' : 'Copy Results Summary'}
              </Button>
              {missedCount > 0 && (
                <Button onClick={handleRetryMissedQuestions} variant="ghost" className="flex-1">
                  Retry Missed Questions
                </Button>
              )}
            </div>

            <div className="space-y-4 mt-8">
              <p className="text-sm uppercase tracking-[0.2em] text-white/50 text-center">Review Answers</p>
              {quiz.questions.map((q, index) => {
                const answerRecord = answers[index];
                const selectedLabel =
                  answerRecord?.selected === null || answerRecord?.selected === undefined
                    ? 'No answer selected'
                    : q.options[answerRecord.selected] ?? 'No answer selected';
                const isCorrect = answerRecord?.selected === answerRecord?.correct;

                return (
                  <div key={q.question + index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold text-sm">{index + 1}. {q.question}</p>
                    <p className="mt-2 text-sm">
                      <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>Your answer: {selectedLabel}</span>
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-green-400">Correct: {q.options[q.answerIndex]}</p>
                    )}
                    <p className="mt-1 text-xs text-white/50">Response time: {answerRecord?.timeSpent ?? 0}s</p>
                    <p className="mt-2 text-xs text-white/50">{q.explanation}</p>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleRestartQuiz} className="w-full mt-6">
              Start New Quiz
            </Button>
          </Card>
        </section>
      </>
    );
  }

  // Active quiz view
  if (quiz) {
    const q = quiz.questions[currentQuestion];

    return (
      <>
        <section className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{quiz.title}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-2xl font-bold text-white md:text-3xl">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </h1>
            <div className="flex items-center gap-2">
              <span className="badge">{score} correct</span>
              <span className="badge">Streak {currentStreak}</span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-glow via-flare to-sun transition-all duration-500 ease-out"
              style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </section>

        <section className="max-w-3xl mx-auto w-full">
          <Card variant="panel" className="p-4 sm:p-6 md:p-8">
            <p className="text-base sm:text-lg font-semibold break-words">{q.question}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleUseFiftyFifty}
                disabled={showExplanation || fiftyFiftyUsed || q.options.length < 4}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="font-semibold">50/50 Lifeline</p>
                <p className="text-white/60">{fiftyFiftyUsed ? 'Used in this quiz' : 'Removes two wrong choices'}</p>
              </button>
              <button
                onClick={handleUseHint}
                disabled={showExplanation || hintUsed}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="font-semibold">Insight Hint</p>
                <p className="text-white/60">{hintUsed ? 'Used in this quiz' : 'Reveal a clue before answering'}</p>
              </button>
            </div>

            {hintText && !showExplanation && (
              <div className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Hint</p>
                <p className="mt-1 text-sm text-sky-100">{hintText}</p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              {q.options.map((option, index) => {
                const isEliminated = !showExplanation && eliminatedOptions.includes(index);

                if (isEliminated) {
                  return (
                    <div key={option + index} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/35">
                      Option {index + 1} removed by 50/50
                    </div>
                  );
                }

                let className = 'w-full rounded-2xl border px-4 py-3 text-left text-sm sm:text-base transition active:scale-[0.98] ';

                if (showExplanation) {
                  if (index === q.answerIndex) {
                    className += 'border-green-500 bg-green-500/20 text-green-300';
                  } else if (index === selectedAnswer) {
                    className += 'border-red-500 bg-red-500/20 text-red-300';
                  } else {
                    className += 'border-white/10 bg-white/5 text-white/50';
                  }
                } else if (index === selectedAnswer) {
                  className += 'border-glow bg-glow/20 text-white';
                } else {
                  className += 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10';
                }

                return (
                  <button
                    key={option + index}
                    onClick={() => handleSelectAnswer(index)}
                    className={className}
                    disabled={showExplanation}
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs">
                      {index + 1}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white/70">Explanation</p>
                <p className="mt-1 text-sm text-white/50">{q.explanation}</p>
              </div>
            )}

            <p className="mt-4 text-xs text-white/50">Keyboard: press 1-4 to select, Enter to submit/continue.</p>

            <div className="mt-6">
              {!showExplanation ? (
                <Button onClick={() => handleSubmitAnswer()} disabled={selectedAnswer === null} className="w-full">
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} className="w-full">
                  {currentQuestion < quiz.questions.length - 1 ? 'Next Question' : 'See Results'}
                </Button>
              )}
            </div>
          </Card>
        </section>
      </>
    );
  }

  // Quiz generation view (default)
  return (
    <>
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Quiziq</p>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">Generate Quiz</h1>
        <p className="max-w-2xl text-sm text-white/70">
          Create quizzes by topic or from your study materials. Dial up difficulty and train with unique lifelines.
        </p>
        {rateLimitStatus && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <div className="rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
              <span className="text-white/50">Daily: </span>
              <span className={rateLimitStatus.daily <= 5 ? 'text-red-400 font-semibold' : 'text-white'}>
                {rateLimitStatus.daily}/{rateLimitStatus.dailyLimit}
              </span>
            </div>
            <div className="rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
              <span className="text-white/50">Monthly: </span>
              <span className={rateLimitStatus.monthly <= 10 ? 'text-red-400 font-semibold' : 'text-white'}>
                {rateLimitStatus.monthly}/{rateLimitStatus.monthlyLimit}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr]">
        <Card variant="panel" className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">New Quiz</p>
              <h2 className="mt-2 font-display text-xl font-semibold">What do you want to study?</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-white/70 mb-2">Mode</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setMode('topic')}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition active:scale-95 ${
                    mode === 'topic'
                      ? 'border-glow bg-glow/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  By Topic
                </button>
                <button
                  onClick={() => setMode('studyGuide')}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition active:scale-95 ${
                    mode === 'studyGuide'
                      ? 'border-glow bg-glow/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  By Study Guide
                </button>
              </div>
            </div>

            {mode === 'topic' && (
              <div>
                <label className="block text-sm text-white/70 mb-2">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g., The history of the Roman Empire"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
              </div>
            )}

            {mode === 'studyGuide' && (
              <div>
                <label className="block text-sm text-white/70 mb-2">Study Guide</label>
                <textarea
                  value={studyGuide}
                  onChange={(event) => setStudyGuide(event.target.value)}
                  placeholder="Paste your notes, outlines, or study guide here"
                  className="w-full h-48 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none resize-none"
                />

                <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer active:scale-95"
                  >
                    <Icons.Upload className="w-4 h-4" />
                    {isProcessingFile ? 'Processing...' : 'Upload File'}
                  </label>

                  {uploadedFileName && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glow/20 border border-glow/30">
                      <Icons.FileText className="w-4 h-4 text-glow" />
                      <span className="text-sm text-white/90">{uploadedFileName}</span>
                      <button onClick={handleClearFile} className="ml-1 text-white/50 hover:text-white transition">
                        <Icons.X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-white/50">Supports .txt, .pdf, and .docx files</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-white/70 mb-2">Question Type</label>
                <select
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value as 'multiple-choice' | 'true-false')}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-white/30 focus:outline-none"
                >
                  <option value="multiple-choice" className="text-ink">Multiple Choice</option>
                  <option value="true-false" className="text-ink">True / False</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-white/30 focus:outline-none"
                >
                  <option value="beginner" className="text-ink">Beginner</option>
                  <option value="intermediate" className="text-ink">Intermediate</option>
                  <option value="advanced" className="text-ink">Advanced</option>
                  <option value="mixed" className="text-ink">Mixed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Number of Questions (3–20)</label>
              <input
                type="number"
                min={3}
                max={20}
                step={1}
                value={numQuestions}
                onChange={(event) => {
                  const value = event.target.value.replace(/[^0-9]/g, '');
                  setNumQuestions(value);
                  const parsedValue = Number.parseInt(value, 10);
                  if (value && (!parsedValue || parsedValue < 3 || parsedValue > 20)) {
                    setError('Please enter a number between 3 and 20');
                  } else {
                    setError(null);
                  }
                }}
                placeholder="e.g., 10"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-white/30 focus:outline-none"
              />
            </div>

            <Button
              onClick={handleGenerateQuiz}
              disabled={
                (mode === 'topic' ? !topic.trim() : !studyGuide.trim()) ||
                isGenerating ||
                !numQuestions ||
                Number.parseInt(numQuestions, 10) < 3 ||
                Number.parseInt(numQuestions, 10) > 20
              }
              className="w-full mt-4"
            >
              {isGenerating ? 'Generating...' : 'Generate Quiz'}
            </Button>
          </div>
        </Card>

        <Card variant="panel" className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Popular</p>
              <h2 className="mt-2 font-display text-xl font-semibold">Trending Topics</h2>
            </div>
          </div>

          <Card variant="simple" className="mb-4 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Current Setup</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge">{DIFFICULTY_LABELS[difficulty]}</span>
              <span className="badge">{questionType === 'multiple-choice' ? 'MCQ' : 'True / False'}</span>
              <span className="badge">Untimed</span>
            </div>
          </Card>

          {loadingTopics ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-3 h-16 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                  <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#3b82f6' }} />
                    <stop offset="50%" style={{ stopColor: '#0ea5e9' }} />
                    <stop offset="100%" style={{ stopColor: '#f59e0b' }} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="space-y-3">
                {trendingTopics.map((topicItem) => {
                  const IconComponent = (Icons as Record<string, unknown>)[topicItem.icon] as
                    | ((props: { size?: number; style?: CSSProperties }) => JSX.Element)
                    | undefined;

                  return (
                    <button
                      key={topicItem.id}
                      onClick={() => {
                        setMode('topic');
                        setTopic(topicItem.title);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10 hover:border-white/20 group active:scale-[0.98]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 transition-all duration-500">
                          {IconComponent && (
                            <IconComponent
                              size={24}
                              style={{
                                stroke: 'url(#iconGradient)',
                                strokeWidth: 2
                              }}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white group-hover:text-glow transition">{topicItem.title}</p>
                          <p className="text-xs text-white/50 mt-1">{topicItem.category}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </section>
    </>
  );
}
