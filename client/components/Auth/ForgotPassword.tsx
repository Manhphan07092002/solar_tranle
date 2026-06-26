import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { Loader2, ArrowLeft } from 'lucide-react';

interface ForgotPasswordProps {
    onSwitchToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const data = await authService.forgotPassword(email);
            setSuccessMessage(data.message);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <button 
                onClick={onSwitchToLogin}
                className="flex items-center text-xs text-slate-500 hover:text-slate-800 mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
            </button>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Forgot Password</h2>
            <p className="text-sm font-medium text-slate-600 mb-6">Enter your email address and we'll send you a link to reset your password.</p>

            {successMessage ? (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm text-sm">
                    {successMessage}
                </div>
            ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-sm text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Email address</label>
                        <input
                            type="email"
                            required
                            placeholder="name@host.com"
                            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-[#5D8DF0] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ForgotPassword;
