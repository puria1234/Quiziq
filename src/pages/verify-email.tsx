import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmail() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            router.replace('/login');
            return;
        }

        if (user.emailVerified) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

    const handleResendVerification = async () => {
        if (!user) return;
        
        setSending(true);
        setMessage(null);

        try {
            await sendEmailVerification(user);
            setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' });
        } catch (err: any) {
            const code = err.code || '';
            if (code.includes('auth/too-many-requests')) {
                setMessage({ type: 'error', text: 'Too many requests. Please wait before trying again.' });
            } else {
                setMessage({ type: 'error', text: 'Failed to send email. Please try again.' });
            }
        } finally {
            setSending(false);
        }
    };

    const handleCheckVerification = async () => {
        if (!user) return;
        
        await user.reload();
        if (user.emailVerified) {
            router.push('/dashboard');
        } else {
            setMessage({ type: 'error', text: 'Email not verified yet. Please check your inbox.' });
        }
    };

    if (authLoading || !user) {
        return null;
    }

    return (
        <div className="flex min-h-[80vh] items-center justify-center">
            <Card variant="panel" className="w-full max-w-md p-8">
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-glow via-flare to-sun">
                        <svg className="h-8 w-8 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="font-display text-3xl font-bold text-white">Verify Your Email</h1>
                    <p className="mt-2 text-sm text-white/60">
                        We've sent a verification link to
                    </p>
                    <p className="mt-1 text-sm text-white font-semibold">{user.email}</p>
                </div>

                <div className="space-y-4">
                    {message && (
                        <div className={`rounded-2xl border px-4 py-3 text-sm text-center ${
                            message.type === 'success' 
                                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                : 'border-red-500/30 bg-red-500/10 text-red-400'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/70 mb-3">What to do next:</p>
                        <ol className="space-y-2 text-sm text-white/60">
                            <li className="flex gap-2">
                                <span className="text-glow">1.</span>
                                Check your inbox for the verification email
                            </li>
                            <li className="flex gap-2">
                                <span className="text-glow">2.</span>
                                Click the verification link in the email
                            </li>
                            <li className="flex gap-2">
                                <span className="text-glow">3.</span>
                                Come back and click "I've Verified" below
                            </li>
                        </ol>
                    </div>

                    <Button 
                        className="w-full" 
                        onClick={handleCheckVerification}
                    >
                        I've Verified My Email
                    </Button>

                    <button
                        onClick={handleResendVerification}
                        disabled={sending}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                        {sending ? 'Sending...' : 'Resend Verification Email'}
                    </button>

                    <div className="text-center text-sm text-white/60">
                        Wrong email?{' '}
                        <button 
                            onClick={() => auth.signOut().then(() => router.push('/signup'))}
                            className="text-glow hover:underline"
                        >
                            Sign up again
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
