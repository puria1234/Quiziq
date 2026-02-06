import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { updateProfile, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export default function Settings() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        setDisplayName(user.displayName || '');
    }, [user, authLoading, router]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            await updateProfile(user, {
                displayName: displayName.trim()
            });
            setSuccess('Profile updated successfully!');
        } catch (err: any) {
            setError('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email) return;

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            // Reauthenticate first
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            
            // Then update password
            await updatePassword(user, newPassword);
            setSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            if (err.code === 'auth/wrong-password') {
                setError('Current password is incorrect');
            } else if (err.code === 'auth/requires-recent-login') {
                setError('Please sign out and sign back in before changing your password');
            } else {
                setError('Failed to change password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!user) return;

        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            // Delete all quiz history from Firestore
            const quizHistoryRef = collection(db, 'users', user.uid, 'quizHistory');
            const querySnapshot = await getDocs(query(quizHistoryRef));
            const deletePromises = querySnapshot.docs.map(docSnapshot => 
                deleteDoc(doc(db, 'users', user.uid, 'quizHistory', docSnapshot.id))
            );
            await Promise.all(deletePromises);
            
            setSuccess('Quiz history cleared successfully!');
            setShowClearHistoryConfirm(false);
        } catch (err: any) {
            setError('Failed to clear quiz history. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        setError(null);
        setLoading(true);

        try {
            const isPasswordUser = user.providerData.some(provider => provider.providerId === 'password');
            
            // For email/password users, reauthenticate first
            if (user.email && isPasswordUser) {
                const credential = EmailAuthProvider.credential(user.email, deletePassword);
                await reauthenticateWithCredential(user, credential);
            }
            
            // Delete all quiz history from Firestore
            const quizHistoryRef = collection(db, 'users', user.uid, 'quizHistory');
            const querySnapshot = await getDocs(query(quizHistoryRef));
            const deletePromises = querySnapshot.docs.map(docSnapshot => 
                deleteDoc(doc(db, 'users', user.uid, 'quizHistory', docSnapshot.id))
            );
            await Promise.all(deletePromises);
            
            // Delete the user document
            await deleteDoc(doc(db, 'users', user.uid));
            
            // Delete account
            await deleteUser(user);
            router.push('/');
        } catch (err: any) {
            if (err.code === 'auth/wrong-password') {
                setError('Incorrect password');
            } else if (err.code === 'auth/requires-recent-login') {
                setError('Please sign out and sign back in before deleting your account');
            } else {
                setError('Failed to delete account. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) {
        return null;
    }

    const isPasswordUser = user?.providerData?.some(provider => provider?.providerId === 'password') ?? false;

    return (
        <>
            <section className="flex flex-col gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Account</p>
                <h1 className="font-display text-4xl font-bold text-white md:text-5xl">Settings</h1>
                <p className="max-w-2xl text-sm text-white/70">
                    Manage your profile and account settings
                </p>
            </section>

            <section className="max-w-2xl space-y-6">
                {/* Profile Settings */}
                <Card variant="panel" className="p-6 md:p-8">
                    <h2 className="font-display text-2xl font-semibold mb-6">Profile Settings</h2>
                    
                    {error && (
                        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}
                    
                    {success && (
                        <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <Input
                            label="Display Name"
                            placeholder="Your Name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                        
                        <Input
                            label="Email"
                            type="email"
                            value={user.email || ''}
                            disabled
                            className="opacity-50 cursor-not-allowed"
                        />
                        
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? 'Saving...' : 'Save Profile'}
                        </Button>
                    </form>
                </Card>

                {/* Change Password - Only for email/password users */}
                {isPasswordUser && (
                    <Card variant="panel" className="p-6 md:p-8">
                        <h2 className="font-display text-2xl font-semibold mb-6">Change Password</h2>
                        
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <Input
                                label="Current Password"
                                type="password"
                                placeholder="••••••••"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                            
                            <Input
                                label="New Password"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            
                            <Input
                                label="Confirm New Password"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? 'Changing...' : 'Change Password'}
                            </Button>
                        </form>
                    </Card>
                )}

                {/* Clear Quiz History */}
                <Card variant="panel" className="p-6 md:p-8 border-yellow-500/30">
                    <h2 className="font-display text-2xl font-semibold mb-2 text-yellow-400">Clear Quiz History</h2>
                    <p className="text-sm text-white/60 mb-6">
                        This will permanently delete all your quiz history. Your account will remain active.
                    </p>
                    
                    {!showClearHistoryConfirm ? (
                        <Button 
                            onClick={() => setShowClearHistoryConfirm(true)}
                            className="w-full bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500/30 text-yellow-400"
                        >
                            Clear All History
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                                <p className="text-sm font-semibold text-yellow-400 mb-2">
                                    Are you sure?
                                </p>
                                <p className="text-xs text-yellow-400/70">
                                    This will delete all your quiz history. This action cannot be undone.
                                </p>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => {
                                        setShowClearHistoryConfirm(false);
                                        setError(null);
                                    }}
                                    className="flex-1"
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleClearHistory}
                                    disabled={loading}
                                    className="flex-1 bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500/30 text-yellow-400"
                                >
                                    {loading ? 'Clearing...' : 'Clear History'}
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Delete Account */
                <Card variant="panel" className="p-6 md:p-8 border-red-500/30">
                    <h2 className="font-display text-2xl font-semibold mb-2 text-red-400">Danger Zone</h2>
                    <p className="text-sm text-white/60 mb-6">
                        Once you delete your account, there is no going back. All your quiz history will be permanently deleted.
                    </p>
                    
                    {!showDeleteConfirm ? (
                        <Button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-400"
                        >
                            Delete Account
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                                <p className="text-sm font-semibold text-red-400 mb-2">
                                    Are you absolutely sure?
                                </p>
                                <p className="text-xs text-red-400/70">
                                    This action cannot be undone.
                                    {isPasswordUser ? ' Please enter your password to confirm.' : ''}
                                </p>
                            </div>
                            
                            {isPasswordUser && (
                                <Input
                                    label="Enter your password to confirm"
                                    type="password"
                                    placeholder="••••••••"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    required
                                />
                            )}
                            
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeletePassword('');
                                        setError(null);
                                    }}
                                    className="flex-1"
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleDeleteAccount}
                                    disabled={isPasswordUser ? ((!deletePassword) || loading) : loading}
                                    className="flex-1 bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-400"
                                >
                                    {loading ? 'Deleting...' : 'Delete Forever'}
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </section>
        </>
    );
}
