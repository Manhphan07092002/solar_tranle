import React from 'react';
import { PenTool } from 'lucide-react';

interface LandingProps {
    onLoginClick: () => void;
    onRegisterClick: () => void;
}

const Landing: React.FC<LandingProps> = ({ onLoginClick, onRegisterClick }) => {
    return (
        <div className="w-full h-screen relative flex items-center p-8 md:p-16 overflow-hidden">
            {/* Video Background */}
            <div className="absolute inset-0 z-0">
                <iframe
                    src="https://player.vimeo.com/video/839729239?autoplay=1&muted=1&background=1&quality=540p"
                    allow="autoplay; fullscreen; picture-in-picture"
                    className="w-full h-[150%] md:h-[120%] lg:h-full object-cover pointer-events-none scale-150 lg:scale-100 origin-center"
                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.1)' }}
                ></iframe>
                {/* Overlay to ensure text readability */}
                <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-2xl text-left text-white">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight" style={{ color: '#FF3B30' }}>
                    SolarEdge Designer
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl font-medium mb-8">
                    Elevate designs. Boost your sales.
                </p>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onLoginClick}
                        className="px-8 py-2.5 bg-[#FF3B30] hover:bg-[#ff5247] text-white font-semibold rounded-full transition-colors"
                    >
                        Log in
                    </button>
                    <button 
                        onClick={onRegisterClick}
                        className="px-8 py-2.5 bg-[#001D4A] hover:bg-[#002d73] text-white font-semibold rounded-full transition-colors"
                    >
                        Sign up
                    </button>
                </div>
            </div>

            {/* Floating Launch Designer Icon (Optional, matching image) */}
            <div className="absolute right-8 top-1/3 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#001D4A] rounded-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#002d73] transition-colors shadow-lg">
                    <PenTool className="w-6 h-6 text-white mb-1" />
                    <span className="text-[10px] text-white font-medium text-center leading-tight">Launch<br/>Designer</span>
                </div>
            </div>
        </div>
    );
};

export default Landing;
