import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { Loader2 } from 'lucide-react';

interface RegisterProps {
    onRegisterSuccess: (user: any, token: string) => void;
    onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await authService.register({ name, email, password });
            onRegisterSuccess(data, data.token);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Register</h2>
            
            <p className="text-sm font-bold text-slate-700 mb-4">Create a new account</p>

            <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-sm text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Name</label>
                    <input
                        type="text"
                        required
                        placeholder="John Doe"
                        className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

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

                <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Password</label>
                    <input
                        type="password"
                        required
                        placeholder="Create password"
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
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register'}
                    </button>
                </div>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-white text-slate-500">Or</span>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-sm shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Sign in instead
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Register;
