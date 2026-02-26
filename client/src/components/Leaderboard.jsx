import { Trophy, Pencil, CheckCircle2 } from 'lucide-react';

export default function Leaderboard({ players }) {
    // Sort players by score descending
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    return (
        <div className="flex flex-col h-full bg-black/30 rounded-xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 border-b border-white/10 p-4">
                <h3 className="font-bold flex items-center gap-2 text-[var(--neon-primary)]">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Leaderboard
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                <div className="space-y-2">
                    {sortedPlayers.map((p, idx) => (
                        <div
                            key={p.id}
                            className={`relative flex items-center p-2 sm:p-3 rounded-lg border transition-all ${p.isDrawer
                                ? 'bg-[var(--neon-secondary)]/10 border-[var(--neon-secondary)]/30 shadow-[inset_0_0_10px_rgba(255,0,85,0.1)]'
                                : p.hasGuessed
                                    ? 'bg-green-500/20 border-green-500/50 shadow-[0_0_15px_rgba(0,255,0,0.6)]'
                                    : 'bg-white/5 border-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-2 sm:gap-3 w-full">
                                <span className={`text-[10px] sm:text-xs font-bold w-3 sm:w-4 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-white/30'
                                    }`}>
                                    #{idx + 1}
                                </span>

                                <div className="relative flex-shrink-0">
                                    <img src={p.avatar} alt={p.name} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/50 border border-white/10" />
                                    {p.isDrawer && (
                                        <div className="absolute -bottom-1 -right-1 bg-[var(--neon-secondary)] rounded-full p-0.5 border border-black shadow-[0_0_8px_rgba(255,0,85,0.5)]">
                                            <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                        </div>
                                    )}
                                    {p.hasGuessed && !p.isDrawer && (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-black shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white text-[10px] sm:text-xs leading-tight sm:leading-normal break-words">
                                        {p.name}
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] text-[var(--text-secondary)] mt-0.5">
                                        {p.score} pts
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
