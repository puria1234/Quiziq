import React, { useEffect } from 'react';
import Nav from './Nav';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        
        const publicPages = new Set(['/', '/login', '/signup', '/forgot-password']);
        const authOnlyPages = new Set(['/login', '/signup']);
        
        // If not signed in and trying to access a protected page, redirect to login
        if (!user && !publicPages.has(router.pathname)) {
            router.replace('/login');
            return;
        }
        
        // If signed in and trying to access login/signup, redirect to dashboard
        if (user && authOnlyPages.has(router.pathname)) {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);

    if (loading) {
        return null;
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
