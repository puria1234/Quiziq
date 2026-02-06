import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import Link from 'next/link';
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

export default function Dashboard() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'topic' | 'studyGuide'>('topic');
  const [topic, setTopic] = useState('');
  const [studyGuide, setStudyGuide] = useState('');
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'true-false'>('multiple-choice');
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
  const [answers, setAnswers] = useState<{selected: number; correct: number}[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<Array<{id: string; title: string; category: string; icon: string}>>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        const res = await fetch('/api/trending-topics');
        if (res.ok) {
          const data = await res.json();
          setTrendingTopics(data.topics);
        }
      } catch (error) {
        console.error('Failed to fetch trending topics:', error);
      } finally {
        setLoadingTopics(false);
      }
    };
    fetchTrendingTopics();
  }, []);

  const handleGenerateQuiz = async () => {
    const content = mode === 'topic' ? topic.trim() : studyGuide.trim();
    if (!content) return;
    
    const parsed = parseInt(numQuestions, 10);
    if (!parsed || parsed < 3 || parsed > 50 || !Number.isInteger(parsed)) {
      setError('Please enter a whole number between 3 and 50');
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
          count: parsed,
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate quiz');
      }

      const data: Quiz = await res.json();
      setQuiz(data);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setScore(0);
      setQuizComplete(false);
      setAnswers([]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (!quiz || selectedAnswer === null) return;
    const currentQ = quiz.questions[currentQuestion];
    const correct = currentQ.answerIndex;
    if (selectedAnswer === correct) {
      setScore(score + 1);
    }
    setAnswers([...answers, { selected: selectedAnswer, correct }]);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizComplete(true);
    }
  };

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
    setUploadedFileName(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setError(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let extractedText = '';

      if (fileExtension === 'txt') {
        // Handle text files
        extractedText = await file.text();
      } else if (fileExtension === 'pdf') {
        // Handle PDF files
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const textParts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          textParts.push(pageText);
        }
        extractedText = textParts.join('\n\n');
      } else if (fileExtension === 'docx') {
        // Handle DOCX files
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
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
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
    if (!quizComplete || !quiz || !user || hasSavedRef.current) return;
    const saveHistory = async () => {
      setSaveStatus('saving');
      try {
        const percentage = quiz.questions.length > 0 ? Math.round((score / quiz.questions.length) * 100) : 0;
        
        const content = mode === 'topic' ? topic.trim() : studyGuide.trim();
        
        await addDoc(collection(db, 'users', user.uid, 'quizHistory'), {
          title: quiz.title,
          topic: content,
          score,
          total: quiz.questions.length,
          percent: percentage,
          settings: {
            count: parseInt(numQuestions),
            mode,
            questionType
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
    mode,
    topic,
    studyGuide,
    score,
    numQuestions,
    questionType
  ]);

  // Quiz complete view
  if (quizComplete && quiz) {
    return (
      <>
        <section className="flex flex-col gap-3 items-center text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Results</p>
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">Quiz Complete.</h1>
        </section>

        <section className="max-w-2xl mx-auto w-full">
          <Card variant="panel" className="p-4 sm:p-6 md:p-8">
            {(() => {
              const percentage = quiz.questions.length > 0 ? Math.round((score / quiz.questions.length) * 100) : 0;
              
              return (
                <>  
                  <div className="text-center mb-6">
                    <p className="text-5xl sm:text-6xl font-bold text-glow">{percentage}%</p>
                    <p className="mt-2 text-white/70">
                      You got {score} out of {quiz.questions.length} correct
                    </p>
                  </div>
                  {user && (
                    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60 text-center">
                      {saveStatus === 'saving' && 'Saving your quiz to history...'}
                      {saveStatus === 'saved' && 'Saved to your quiz history.'}
                      {saveStatus === 'error' && 'Could not save to history. Try again later.'}
                    </div>
                  )}
                </>
              );
            })()}
            
            <div className="space-y-4 mt-8">
              <p className="text-sm uppercase tracking-[0.2em] text-white/50 text-center">Review Answers</p>
              {quiz.questions.map((q, idx) => (
                <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-sm">{idx + 1}. {q.question}</p>
                  <p className="mt-2 text-sm">
                    <span className={answers[idx]?.selected === answers[idx]?.correct ? 'text-green-400' : 'text-red-400'}>
                      Your answer: {q.options[answers[idx]?.selected]}
                    </span>
                  </p>
                  {answers[idx]?.selected !== answers[idx]?.correct && (
                    <p className="text-sm text-green-400">
                      Correct: {q.options[q.answerIndex]}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-white/50">{q.explanation}</p>
                </div>
              ))}
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
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-white md:text-3xl">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </h1>
            <span className="badge">{score} correct</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-glow via-flare to-sun transition-all duration-500 ease-out" 
              style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </section>

        <section className="max-w-2xl mx-auto w-full">
          <Card variant="panel" className="p-4 sm:p-6 md:p-8">
            <p className="text-base sm:text-lg font-semibold break-words">{q.question}</p>
            
            <div className="mt-6 space-y-3">
              {q.options.map((option, idx) => {
                  let className = "w-full rounded-2xl border px-4 py-3 text-left text-sm sm:text-base transition active:scale-[0.98] ";
                  
                  if (showExplanation) {
                    if (idx === q.answerIndex) {
                      className += "border-green-500 bg-green-500/20 text-green-300";
                    } else if (idx === selectedAnswer) {
                      className += "border-red-500 bg-red-500/20 text-red-300";
                    } else {
                      className += "border-white/10 bg-white/5 text-white/50";
                    }
                  } else if (idx === selectedAnswer) {
                    className += "border-glow bg-glow/20 text-white";
                  } else {
                    className += "border-white/10 bg-white/5 text-white/70 hover:bg-white/10";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      className={className}
                      disabled={showExplanation}
                    >
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

            <div className="mt-6">
              {!showExplanation ? (
                <Button 
                  onClick={handleSubmitAnswer} 
                  disabled={selectedAnswer === null}
                  className="w-full"
                >
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
          Create quizzes by topic or from your study materials. Choose your question type and get instant feedback.
        </p>
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
            
            {/* Mode Selection */}
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

            {/* Topic Input */}
            {mode === 'topic' && (
              <div>
                <label className="block text-sm text-white/70 mb-2">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., The history of the Roman Empire"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
              </div>
            )}

            {/* Study Guide Input */}
            {mode === 'studyGuide' && (
              <div>
                <label className="block text-sm text-white/70 mb-2">Study Guide</label>
                <textarea
                  value={studyGuide}
                  onChange={(e) => setStudyGuide(e.target.value)}
                  placeholder="Paste your notes, outlines, or study guide here"
                  className="w-full h-48 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none resize-none"
                />
                
                {/* File Upload */}
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
                      <button
                        onClick={handleClearFile}
                        className="ml-1 text-white/50 hover:text-white transition"
                      >
                        <Icons.X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <p className="mt-2 text-xs text-white/50">
                  Supports .txt, .pdf, and .docx files
                </p>
              </div>
            )}

            {/* Question Type Selector */}
            <div>
              <label className="block text-sm text-white/70 mb-2">Question Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as 'multiple-choice' | 'true-false')}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="multiple-choice">Multiple Choice</option>
                <option value="true-false">True / False</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Number of Questions (3–50)</label>
              <input
                type="number"
                min={3}
                max={50}
                step={1}
                value={numQuestions}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setNumQuestions(val);
                  const num = parseInt(val, 10);
                  if (val && (!num || num < 3 || num > 50)) {
                    setError('Please enter a number between 3 and 50');
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
                parseInt(numQuestions, 10) < 3 ||
                parseInt(numQuestions, 10) > 50
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
          
          {loadingTopics ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 h-16 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                  <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#16f2f2' }} />
                    <stop offset="50%" style={{ stopColor: '#ff5f6d' }} />
                    <stop offset="100%" style={{ stopColor: '#ffc371' }} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="space-y-3">
                {trendingTopics.map((topicItem) => {
                  const IconComponent = (Icons as any)[topicItem.icon];
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
        </Card>      </section>

    </>
  );
}
