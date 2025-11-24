import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatWidgetProps {
  isOpen: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Chat Session
  useEffect(() => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatSessionRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are the AI System Operator of a global monitoring dashboard. You provide concise, intelligent, and slightly robotic responses. You assist the user with information analysis or general conversation. Keep tone professional and cyber-punk style.",
            }
        });
    } catch (e) {
        console.error("Failed to init AI", e);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
        textareaRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
        const result = await chatSessionRef.current.sendMessageStream({ message: userMsg });
        
        let fullText = "";
        setMessages(prev => [...prev, { role: 'model', text: "" }]);

        for await (const chunk of result) {
            const text = chunk.text;
            if (text) {
                fullText += text;
                setMessages(prev => {
                    const newHistory = [...prev];
                    const lastMsg = newHistory[newHistory.length - 1];
                    if (lastMsg.role === 'model') {
                        lastMsg.text = fullText;
                    }
                    return newHistory;
                });
            }
        }
    } catch (error) {
        console.error("Chat Error", error);
        setMessages(prev => [...prev, { role: 'model', text: "ERROR: COMMUNICATION LINK SEVERED." }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 w-80 md:w-96 h-[450px] bg-black/90 border border-cyan-900/50 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.15)] rounded-sm flex flex-col overflow-hidden z-40 animate-[slideIn_0.3s_ease-out]">
        
        {/* Header */}
        <div className="bg-cyan-950/30 border-b border-cyan-900/50 p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                <span className="text-cyan-400 font-digital tracking-widest text-sm font-bold">AI COMM LINK</span>
            </div>
            <div className="text-[10px] text-cyan-700 font-mono">SYS.OP.ONLINE</div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
            {messages.length === 0 && (
                <div className="text-cyan-800/50 text-center text-xs font-mono mt-10 tracking-widest">
                    ESTABLISHING CONNECTION...<br/>
                    READY FOR INPUT.
                </div>
            )}
            
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-2 rounded-sm text-xs md:text-sm font-sans tracking-wide leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-cyan-900/20 text-cyan-100 border border-cyan-800/50 rounded-br-none' 
                        : 'bg-slate-900/50 text-slate-300 border border-slate-700/50 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="bg-slate-900/50 border border-slate-700/50 p-2 rounded-sm rounded-bl-none">
                        <div className="flex gap-1">
                            <div className="w-1 h-1 bg-cyan-500 animate-bounce"></div>
                            <div className="w-1 h-1 bg-cyan-500 animate-bounce [animation-delay:0.1s]"></div>
                            <div className="w-1 h-1 bg-cyan-500 animate-bounce [animation-delay:0.2s]"></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-2 bg-black/50 border-t border-cyan-900/30 flex gap-2">
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                className="flex-1 bg-slate-900/50 border border-slate-700 text-slate-200 text-xs p-2 rounded-sm focus:border-cyan-500 focus:outline-none resize-none h-10 scrollbar-none font-mono"
            />
            <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-cyan-900/30 text-cyan-400 border border-cyan-800 hover:bg-cyan-800/30 hover:text-cyan-200 px-3 rounded-sm transition-colors disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            </button>
        </div>
    </div>
  );
};
