import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Settings } from 'lucide-react';
import { chatWithSolarAssistant } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface SolarAssistantProps {
  projectContext: string;
}

export const SolarAssistant: React.FC<SolarAssistantProps> = ({ projectContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: 'Hello! I am your Solar Design AI. Ask me about optimal tilt, equipment choices, or financial metrics.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Format history for the API
    const apiHistory = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    try {
      const responseText = await chatWithSolarAssistant(userMsg.text, projectContext, apiHistory);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText || "I couldn't generate a response." };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: `Error: ${error.message}. Please check your API Key.` 
      };
      setMessages(prev => [...prev, errorMsg]);
      if (error.message.includes("API Key")) {
          setShowKeyInput(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveKey = () => {
      localStorage.setItem('gemini_api_key', apiKey);
      setShowKeyInput(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 rounded-full shadow-lg hover:shadow-xl transition-all z-50 flex items-center gap-1.5 text-sm"
      >
        <Bot size={16} />
        <span className="font-medium hidden md:inline">AI Helper</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-28 right-4 w-72 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col h-[420px] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-blue-400" />
          <h3 className="font-semibold">Solar Assistant</h3>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-gray-400 hover:text-white"><Settings size={18}/></button>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
      </div>

      {/* API Key Input Overlay */}
      {showKeyInput && (
          <div className="bg-gray-100 p-4 border-b border-gray-200">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Google Gemini API Key</label>
              <div className="flex gap-2">
                <input 
                    type="password" 
                    value={apiKey} 
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 text-sm border rounded px-2 py-1"
                    placeholder="Enter key..."
                />
                <button onClick={saveKey} className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Save</button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Key is stored in localStorage.</p>
          </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-200 rounded-lg p-3 rounded-tl-none shadow-sm flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about wiring, shading..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
