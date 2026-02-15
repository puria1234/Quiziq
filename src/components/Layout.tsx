import React, { useEffect } from 'react';
import Nav from './Nav';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';

const PUBLIC_PAGES = new Set(['/', '/login', '/signup', '/forgot-password']);
const AUTH_ONLY_PAGES = new Set(['/login', '/signup']);

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const isPublicPage = PUBLIC_PAGES.has(router.pathname);

    useEffect(() => {
        if (loading) return;
        
        // If not signed in and trying to access a protected page, redirect to login
        if (!user && !isPublicPage) {
            router.replace('/login');
            return;
        }
        
        // If signed in and trying to access login/signup, redirect to dashboard
        if (user && AUTH_ONLY_PAGES.has(router.pathname)) {
            router.replace('/dashboard');
        }
    }, [user, loading, router, isPublicPage]);

    if (loading && !isPublicPage) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-ink text-white font-body selection:bg-glow/30">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <div className="absolute left-10 top-16 h-40 w-40 rounded-full bg-flare/30 blur-3xl" />
                    <div className="absolute right-16 top-10 h-52 w-52 rounded-full bg-glow/30 blur-3xl" />
                    <div className="absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sun/20 blur-3xl" />
                    <div className="absolute -bottom-8 -right-4 h-24 w-24 rounded-full bg-glow/40 blur-2xl" />
                </div>
                <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-3 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                    <p className="text-sm text-white/60">Loading your account…</p>
                </main>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-ink text-white font-body selection:bg-glow/30">
            {/* Background Gradients */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute left-10 top-16 h-40 w-40 rounded-full bg-flare/30 blur-3xl" />
                <div className="absolute right-16 top-10 h-52 w-52 rounded-full bg-glow/30 blur-3xl" />
                <div className="absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sun/20 blur-3xl" />
                <div className="absolute -bottom-8 -right-4 h-24 w-24 rounded-full bg-glow/40 blur-2xl" />
            </div>

            <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-10 lg:px-10">
                <Nav />
                {children}
            </main>
        </div>
    );
}
