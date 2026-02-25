import { useState } from 'react';
import { socket } from '../socket';
import { Gamepad2, Users, Wand2, Copy, Check } from 'lucide-react';

export default function Lobby({ onJoin }) {
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    const getAvatarUrl = (seed) => `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=0d0f1a`;

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (!name.trim()) return setError('Please enter a nickname');

        setLoading(true);
        socket.emit('create-room', { playerName: name, avatar: getAvatarUrl(name) }, (response) => {
            setLoading(false);
            if (response.success) {
                onJoin(response.room, response.player);
            } else {
                setError('Failed to create room');
            }
        });
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (!name.trim()) return setError('Please enter a nickname');
        if (!roomCode.trim()) return setError('Please enter a room code');

        setLoading(true);
        socket.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName: name, avatar: getAvatarUrl(name) }, (response) => {
            setLoading(false);
            if (response.success) {
                onJoin(response.room, response.player);
            } else {
                setError(response.message || 'Failed to join room');
            }
        });
    };

    // Generate a random fun name
    const generateName = () => {
        const adjectives = ['Cosmic', 'Neon', 'Cyber', 'Quantum', 'Pixel', 'Turbo'];
        const nouns = ['Ninja', 'Rider', 'Phantom', 'Wizard', 'Dragon', 'Panda'];
        const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
        setName(`${random(adjectives)}${random(nouns)}${Math.floor(Math.random() * 99)}`);
    };

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-md p-8 relative overflow-hidden">
                {/* Glow effects */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--neon-primary)] rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[var(--neon-secondary)] rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="text-center mb-10">
                        <h1 className="text-5xl font-black mb-2 tracking-tighter" style={{ textShadow: '0 0 20px rgba(0,240,255,0.5)' }}>
                            SCRIBBLE<span className="text-[var(--neon-secondary)]">.IO</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] font-medium">Draw, Guess, Win!</p>
                    </div>

                    <div className="mb-8 flex justify-center">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full border-2 border-[var(--neon-primary)] flex items-center justify-center bg-[#0d0f1a] overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-transform group-hover:scale-105">
                                {name ? (
                                    <img src={getAvatarUrl(name)} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <Users className="w-10 h-10 text-[var(--neon-primary)] opacity-50" />
                                )}
                            </div>
                            <button
                                onClick={generateName}
                                title="Generate Random Name"
                                className="absolute -bottom-3 -right-3 p-2 bg-[var(--neon-secondary)] rounded-full text-white hover:bg-pink-600 transition-colors shadow-[0_0_10px_rgba(255,0,85,0.5)]"
                            >
                                <Wand2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Your Nickname</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter a cool name"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)] transition-all font-medium"
                                maxLength={15}
                            />
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <button
                                onClick={handleCreateRoom}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-[var(--neon-primary)] hover:bg-[#00d0dd] text-gray-900 font-bold py-3 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] disabled:opacity-50"
                            >
                                <Gamepad2 className="w-5 h-5" />
                                {loading ? 'Starting...' : 'Create Private Room'}
                            </button>
                        </div>

                        <div className="relative flex items-center py-4">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink-0 mx-4 text-[var(--text-secondary)] text-sm font-medium uppercase">or join</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="ROOM CODE"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[var(--neon-secondary)] focus:ring-1 focus:ring-[var(--neon-secondary)] transition-all font-bold tracking-widest text-center uppercase"
                                maxLength={6}
                            />
                            <button
                                onClick={handleJoinRoom}
                                disabled={loading || !roomCode}
                                className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-lg transition-all border border-white/10 disabled:opacity-50"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
