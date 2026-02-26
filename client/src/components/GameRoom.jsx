import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import Canvas from './Canvas';
import Chat from './Chat';
import Leaderboard from './Leaderboard';
import { Share2, Clock, Check, Users, PlayCircle, Trophy } from 'lucide-react';
import { playTickSound, playJoinSound } from '../utils/audio';

export default function GameRoom({ room, player, onLeave }) {
    const [messages, setMessages] = useState(room.messages || []);
    const [systemMessage, setSystemMessage] = useState(null);
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const prevPlayersRef = useRef(room.players?.length || 0);
    const isDrawer = player.id === room.players[room.drawerIndex]?.id;
    const isHost = player.id === room.players[0]?.id;

    // Audio effects for players joining
    useEffect(() => {
        if (room.players?.length > prevPlayersRef.current) {
            playJoinSound();
        }
        prevPlayersRef.current = room.players?.length;
    }, [room.players]);

    useEffect(() => {
        const handleChat = (msg) => {
            setMessages(prev => [...prev, msg]);
        };

        const handleSysMsg = (msg) => {
            setMessages(prev => [...prev, { ...msg, system: true }]);
            setSystemMessage(msg);
            setTimeout(() => setSystemMessage(null), 3000);
        };

        socket.on('chat-message', handleChat);
        socket.on('system-message', handleSysMsg);

        return () => {
            socket.off('chat-message', handleChat);
            socket.off('system-message', handleSysMsg);
        };
    }, []);

    useEffect(() => {
        let interval;
        if (room.status === 'drawing' && room.roundEndTime) {
            setTimeLeft(Math.max(0, Math.ceil((room.roundEndTime - Date.now()) / 1000)));
            interval = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((room.roundEndTime - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 5 && remaining > 0) {
                    playTickSound();
                }
                if (remaining <= 0) clearInterval(interval);
            }, 1000);
        } else {
            setTimeLeft(0);
        }
        return () => clearInterval(interval);
    }, [room.status, room.roundEndTime]);

    const copyRoomCode = () => {
        navigator.clipboard.writeText(room.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const startGame = () => {
        socket.emit('start-game', { roomCode: room.code });
    };

    const selectWord = (word) => {
        socket.emit('word-selected', { roomCode: room.code, word });
    };

    // Helper renderer for different game states
    const renderGameOverlay = () => {
        if (room.status === 'game_end') {
            return (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center rounded-xl border border-[var(--neon-primary)]/50">
                    <Trophy className="w-24 h-24 text-yellow-400 mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                    <h1 className="text-4xl text-white mb-2 font-black tracking-widest text-shadow-glow">GAME OVER</h1>
                    <p className="text-xl text-[var(--text-secondary)] mb-8 font-bold">Look at the final scores!</p>
                    <div className="flex gap-4">
                        {isHost ? (
                            <button
                                onClick={() => socket.emit('play-again', { roomCode: room.code })}
                                className="bg-[var(--neon-primary)] text-slate-900 font-bold px-8 py-3 rounded-full hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                            >
                                Play Again
                            </button>
                        ) : (
                            <div className="bg-white/10 text-white font-bold px-8 py-3 rounded-full animate-pulse border border-white/20">
                                Waiting for Host...
                            </div>
                        )}
                        <button
                            onClick={onLeave}
                            className="bg-red-500/20 text-red-300 font-bold px-8 py-3 rounded-full hover:bg-red-500/40 border border-red-500/30 transition-colors"
                        >
                            Leave Room
                        </button>
                    </div>
                </div>
            );
        }

        if (room.status === 'choosing_word') {
            return (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8 rounded-xl">
                    {isDrawer ? (
                        <div className="bg-[#1a1c29] p-8 rounded-2xl border border-[var(--neon-primary)]/50 shadow-[0_0_40px_rgba(0,240,255,0.2)] max-w-md w-full text-center">
                            <h2 className="text-2xl font-bold mb-6 text-white text-shadow-glow">Choose a Word!</h2>
                            <div className="flex flex-col gap-3">
                                {room.wordChoices?.map(word => (
                                    <button
                                        key={word}
                                        onClick={() => selectWord(word)}
                                        className="bg-white/5 hover:bg-[var(--neon-primary)]/20 border border-white/10 hover:border-[var(--neon-primary)] text-lg font-bold py-3 px-6 rounded-lg transition-all text-white"
                                    >
                                        {word.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel p-8 text-center animate-pulse">
                            <h2 className="text-xl font-bold text-white mb-2">{room.players[room.drawerIndex]?.name || 'Drawer'} is choosing a word...</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Get ready to guess!</p>
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col flex-1 max-w-7xl mx-auto w-full gap-4 pb-4">
            {/* Top Header Bar */}
            <div className="glass-panel px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-20">
                <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 w-full md:w-auto">
                    <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                        <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Room</span>
                        <span className="text-2xl font-black text-[var(--neon-primary)] tracking-widest text-shadow-glow">{room.code}</span>
                        <button
                            onClick={copyRoomCode}
                            title="Copy Room Code"
                            className="ml-2 p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
                        >
                            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-white bg-black/40 px-3 sm:px-4 py-2 rounded-lg border border-white/5">
                        <Users className="w-5 h-5 text-[var(--neon-secondary)]" />
                        <span className="font-bold">{room.players.length}/10</span>
                    </div>
                </div>

                {systemMessage && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-white text-black px-6 py-2 rounded-full font-bold shadow-2xl animate-bounce z-50">
                        {systemMessage.text}
                    </div>
                )}

                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 items-center w-full md:w-auto">
                    {room.status === 'playing' || room.status === 'drawing' ? (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Round</span>
                            <span className="text-xl font-black">{room.currentRound} / {room.totalRounds}</span>
                        </div>
                    ) : null}

                    {room.status === 'waiting' && isHost && (
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 bg-[var(--neon-primary)] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#00d0dd] transition-all hover:scale-105"
                        >
                            <PlayCircle className="w-5 h-5" />
                            START GAME
                        </button>
                    )}

                    <button onClick={onLeave} className="text-sm bg-red-500/20 text-red-300 hover:bg-red-500/40 px-4 py-2 rounded-lg border border-red-500/30 transition-colors">
                        Leave Game
                    </button>
                </div>
            </div>

            {/* Main Game Area */}
            <div className="flex flex-col lg:flex-row flex-1 gap-2 lg:gap-4 w-full h-[75vh] lg:h-[600px] min-h-0 items-center lg:items-start justify-center">

                {/* Top/Center: Canvas (order 1 on mobile, 2 on desktop) */}
                <div className="w-full sm:w-[800px] sm:max-w-full relative flex-none aspect-[4/3] flex flex-col gap-2 order-1 lg:order-2 shrink-0">
                    {/* Status Bar above canvas */}
                    {room.status === 'drawing' && (
                        <div className="w-full flex justify-between items-center bg-[#1a1c29] border border-[var(--neon-primary)]/30 p-2 sm:p-3 rounded-xl z-10 shadow-lg shrink-0">
                            <div className="text-white font-black text-lg sm:text-xl tracking-[0.1em] sm:tracking-[0.2em] bg-black/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-full border border-white/10 glass-panel truncate max-w-[60%] sm:max-w-[75%] text-center">
                                {isDrawer ? (
                                    <span className="text-[var(--neon-primary)]">{room.currentWord?.toUpperCase()}</span>
                                ) : (
                                    <span className="tracking-[0.1em] sm:tracking-[0.2em] whitespace-pre text-yellow-300 font-mono text-shadow-glow">{room.wordHint || '...'}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 bg-black/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-red-500/30 text-red-400 glass-panel text-xs sm:text-base shrink-0">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                                <span className="font-bold font-mono">{timeLeft}s</span>
                            </div>
                        </div>
                    )}

                    <Canvas
                        roomCode={room.code}
                        isDrawer={isDrawer}
                        disabled={room.status !== 'drawing'}
                    />

                    {renderGameOverlay()}

                    {room.status === 'waiting' && (
                        <div className="absolute inset-0 bg-black/60 glass-panel z-20 flex flex-col items-center justify-center text-center p-8 rounded-xl border border-white/5">
                            <Users className="w-20 h-20 text-[var(--neon-primary)] mb-6 opacity-80" />
                            <h2 className="text-3xl font-black mb-2 text-white">Waiting for players...</h2>
                            <p className="text-[var(--text-secondary)] mb-6">Invite your friends using room code: <strong className="text-white px-2 py-1 bg-white/10 rounded">{room.code}</strong></p>
                            {!isHost && <div className="animate-pulse text-sm font-bold text-[var(--neon-secondary)]">Waiting for host to start the game!</div>}
                        </div>
                    )}
                </div>

                {/* Bottom Wrapper on Mobile / Contents on Desktop (to split Leaderboard left, chat right) */}
                <div className="flex flex-row flex-1 gap-2 order-2 lg:contents w-full">

                    {/* Leaderboard (Left on mobile, Left on desktop) */}
                    <div className="w-[35%] sm:w-2/5 lg:w-64 flex-shrink-0 flex flex-col gap-2 lg:gap-4 lg:order-1 h-[35vh] lg:h-[600px] min-h-[200px] overflow-y-auto">
                        <Leaderboard players={room.players} />
                    </div>

                    {/* Chat (Right on mobile, Right on desktop) */}
                    <div className="w-[65%] sm:w-3/5 lg:w-[350px] flex-shrink-0 flex flex-col lg:order-3 h-[35vh] lg:h-[600px] min-h-[200px]">
                        <Chat
                            roomCode={room.code}
                            disabled={room.status !== 'drawing' || (isDrawer && room.status === 'drawing')}
                            messages={messages}
                        />
                    </div>

                </div>

            </div>
        </div>
    );
}
