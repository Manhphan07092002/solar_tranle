import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Landing from './Landing';

import logo from '../../Images/1763293698135-932453456.png';

interface AuthContainerProps {
    onLoginSuccess: (user: any, token: string) => void;
    logoUrl?: string;
    appName?: string;
}

const AuthContainer: React.FC<AuthContainerProps> = ({ onLoginSuccess, logoUrl, appName }) => {
    const [view, setView] = useState<'landing' | 'login' | 'register' | 'forgot' | 'reset'>('landing');
    const [resetToken, setResetToken] = useState('');

    // Check for reset token in URL on mount
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('resetToken');
        if (token) {
            setResetToken(token);
            setView('reset');
        }
    }, []);

    if (view === 'landing') {
        return (
            <Landing 
                onLoginClick={() => setView('login')}
                onRegisterClick={() => setView('register')}
                logoUrl={logoUrl}
                appName={appName}
            />
        );
    }

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4 relative"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2072&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Dark overlay for better readability */}
            <div className="absolute inset-0 bg-black/20" />

            <div className="bg-white rounded-md shadow-2xl z-10 w-full max-w-sm overflow-hidden flex flex-col">
                <div className="flex justify-center pt-8 pb-4 relative">
                    <button 
                        onClick={() => setView('landing')}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title="Back to home"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                    ) : (
                        <img src={logo} alt="Logo" className="h-10 object-contain" />
                    )}
                </div>
                
                <div className="px-8 pb-8 flex-1 flex flex-col">

                    {view === 'login' && (
                        <Login 
                            onLoginSuccess={onLoginSuccess} 
                            onSwitchToRegister={() => setView('register')} 
                            onSwitchToForgot={() => setView('forgot')}
                        />
                    )}
                    {view === 'register' && (
                        <Register 
                            onRegisterSuccess={onLoginSuccess} 
                            onSwitchToLogin={() => setView('login')} 
                        />
                    )}
                    {view === 'forgot' && (
                        <ForgotPassword 
                            onSwitchToLogin={() => setView('login')} 
                        />
                    )}
                    {view === 'reset' && (
                        <ResetPassword 
                            token={resetToken}
                            onResetSuccess={(user, token) => {
                                // Clear reset token from URL
                                window.history.replaceState({}, document.title, "/");
                                onLoginSuccess(user, token);
                            }} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthContainer;
