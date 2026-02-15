import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const getErrorMessage = (error: unknown): string => {
    const code = error instanceof FirebaseError ? error.code : '';
    
    if (code.includes('auth/email-already-in-use')) {
        return 'An account with this email already exists';
    }
    if (code.includes('auth/invalid-email')) {
        return 'Please enter a valid email address';
    }
    if (code.includes('auth/weak-password')) {
        return 'Password should be at least 6 characters';
    }
    if (code.includes('auth/operation-not-allowed')) {
        return 'Email/password accounts are not enabled';
    }
    if (code.includes('auth/too-many-requests')) {
        return 'Too many attempts. Please try again later';
    }
    if (code.includes('auth/network-request-failed')) {
        return 'Network error. Please check your connection';
    }
    if (code.includes('auth/popup-blocked')) {
        return 'Popup was blocked. Please allow popups and try again';
    }
    if (code.includes('auth/popup-closed-by-user')) {
        return 'Sign up was cancelled';
    }
    
    return 'Failed to sign up. Please try again';
};

export default function Signup() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (!captchaToken) {
            setError('Please complete the captcha verification');
            return;
        }
        
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, {
                displayName: name
            });
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(getErrorMessage(err));
            // Reset captcha on error
            setCaptchaToken(null);
            captchaRef.current?.resetCaptcha();
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setError(null);
        setLoading(true);

        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return null;
    }

    if (user) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <Card variant="panel" className="w-full max-w-md p-8 text-center">
                    <p className="text-white/70">You&apos;re already signed in!</p>
                    <div className="mt-4 flex gap-3 justify-center">
                        <Button href="/dashboard" variant="primary">Go to Dashboard</Button>
                        <Button href="/" variant="ghost">Go Home</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-[80vh] items-center justify-center px-4">
            <Card variant="panel" className="w-full max-w-md p-6 sm:p-8">
                <div className="mb-6 text-center">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Create Account</h1>
                    <p className="mt-2 text-sm text-white/60">Start mastering any subject with <span className="bg-gradient-to-br from-glow via-flare to-sun bg-clip-text text-transparent font-semibold">AI-powered</span> quizzes</p>
                </div>

                <button
                    onClick={handleGoogleSignup}
                    disabled={loading}
                    className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                </button>

                <form onSubmit={handleSignup} className="flex flex-col gap-4 mt-6">
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <Input
                        label="Name"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />

                    <div className="flex justify-center mt-4">
                        <HCaptcha
                            ref={captchaRef}
                            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ''}
                            onVerify={(token) => setCaptchaToken(token)}
                            onExpire={() => setCaptchaToken(null)}
                            theme="dark"
                        />
                    </div>

                    <Button className="mt-2 w-full" type="submit" disabled={loading || !captchaToken}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-white/60">
                    Already have an account?{' '}
                    <Link href="/login" className="text-glow hover:underline">
                        Sign in
                    </Link>
                </div>
            </Card>
        </div>
    );
}
