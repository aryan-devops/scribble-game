import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { Send, CheckCircle2, MessageSquareWarning } from 'lucide-react';

export default function Chat({ roomCode, disabled, messages }) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || disabled) return;

        socket.emit('send-message', { roomCode, text: input });
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-black/30 rounded-xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                    <MessageSquareWarning className="w-4 h-4 text-[var(--neon-primary)]" />
                    Live Chat
                </h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-white/30 text-sm italic">
                        Say hello to start chatting!
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div
                            key={msg.id || i}
                            className={`text-sm ${msg.system ? 'text-center my-2' : 'flex flex-col'}`}
                        >
                            {msg.system ? (
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${msg.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                        msg.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                            'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}>
                                    {msg.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {msg.text}
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-lg rounded-tl-none p-2.5 ml-2 border border-white/5 shadow-sm">
                                    <span className="font-bold text-xs text-[var(--neon-primary)] block mb-0.5">{msg.sender}</span>
                                    <span className="text-white break-words">{msg.text}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={disabled ? "You cannot guess right now..." : "Type your guess..."}
                    disabled={disabled}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--neon-primary)] disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={disabled || !input.trim()}
                    className="bg-[var(--neon-primary)] text-black p-2 rounded-lg hover:bg-[#00d0dd] transition-colors disabled:opacity-50"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}
