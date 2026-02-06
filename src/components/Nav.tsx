import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

const getGradientFromInitials = (initials: string) => {
  // Generate a hash from initials
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Define gradient combinations
  const gradients = [
    'from-glow via-flare to-sun',
    'from-flare via-sun to-glow',
    'from-sun via-glow to-flare',
    'from-glow via-sun to-flare',
    'from-flare via-glow to-sun',
    'from-sun via-flare to-glow',
    'from-blue-400 via-purple-500 to-pink-500',
    'from-green-400 via-teal-500 to-blue-500',
    'from-purple-400 via-pink-500 to-red-500',
    'from-cyan-400 via-blue-500 to-indigo-500',
    'from-yellow-400 via-orange-500 to-red-500',
    'from-emerald-400 via-green-500 to-teal-500',
  ];
  
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export default function Nav() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  const avatarGradient = getGradientFromInitials(initials);

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    router.push('/');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative flex flex-col gap-4 overflow-visible rounded-3xl border border-white/10 bg-white/5 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-glow via-flare to-sun text-ink">
          <span className="font-display text-lg font-bold">Q</span>
        </div>
        <div>
          <p className="font-display text-lg font-semibold">Quiziq</p>
          <p className="text-xs text-white/60">AI Study Companion</p>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-3 text-sm text-white/70">
        <Link
          href="/"
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Home
        </Link>
        {user && (
          <Link
            href="/dashboard"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Study
          </Link>
        )}
        {user ? (
          <div
            className="absolute right-4 top-4 z-50 sm:relative sm:right-auto sm:top-auto"
            ref={dropdownRef}
          >
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient} text-ink font-bold text-base transition hover:opacity-90 overflow-hidden sm:h-9 sm:w-9 sm:text-sm`}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initials
              )}
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-14 z-50 w-full min-w-[240px] max-w-[280px] pointer-events-auto sm:w-64 rounded-2xl border border-white/15 bg-[#0a0a0f] p-4 shadow-2xl">
                <div className="mb-3 pb-3 border-b border-white/10">
                  <p className="font-semibold text-white text-sm sm:text-base">{user.displayName || 'Student'}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
                <Link
                  href="/history"
                  onClick={() => setShowDropdown(false)}
                  className="mb-2 block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
                >
                  Quiz History
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowDropdown(false)}
                  className="mb-2 block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
}
