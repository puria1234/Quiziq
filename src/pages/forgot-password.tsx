import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch (err: unknown) {
            const firebaseError = err instanceof FirebaseError ? err : null;
            const code = firebaseError?.code || '';
            if (code.includes('auth/user-not-found')) {
                setError('No account found with this email');
            } else if (code.includes('auth/invalid-email')) {
                setError('Please enter a valid email address');
            } else if (code.includes('auth/too-many-requests')) {
                setError('Too many requests. Please try again later');
            } else {
                setError('Failed to send reset email. Please try again');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center">
            <Card variant="panel" className="w-full max-w-md p-8">
                <div className="mb-6 text-center">
                    <h1 className="font-display text-3xl font-bold text-white">Reset Password</h1>
                    <p className="mt-2 text-sm text-white/60">
                        {success 
                            ? 'Check your email for a password reset link'
                            : 'Enter your email to receive a password reset link'
                        }
                    </p>
                </div>

                {success ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 text-center">
                            Password reset email sent! Check your inbox and spam folder.
                        </div>
                        <Link href="/login">
                            <Button className="w-full">
                                Back to Sign In
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="flex flex-col gap-4">
                        {error && (
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
                                {error}
                            </div>
                        )}
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Button className="mt-2 w-full" type="submit" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </Button>

                        <div className="text-center text-sm text-white/60">
                            Remember your password?{' '}
                            <Link href="/login" className="text-glow hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}
