import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { Loader2 } from 'lucide-react';

interface ResetPasswordProps {
    token: string;
    onResetSuccess: (user: any, token: string) => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onResetSuccess }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await authService.resetPassword(token, password);
            onResetSuccess(data, data.token);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Reset Password</h2>
            
            <p className="text-sm font-bold text-slate-700 mb-4">Create a new password</p>

            <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-sm text-sm">
                        {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">New Password</label>
                    <input
                        type="password"
                        required
                        placeholder="Enter new password"
                        className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-[#5D8DF0] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ResetPassword;
