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
                            className={`relative flex items-center p-3 rounded-lg border transition-all ${p.isDrawer
                                    ? 'bg-[var(--neon-secondary)]/10 border-[var(--neon-secondary)]/30 shadow-[inset_0_0_10px_rgba(255,0,85,0.1)]'
                                    : p.hasGuessed
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-white/5 border-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <span className={`text-sm font-bold w-4 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-white/30'
                                    }`}>
                                    #{idx + 1}
                                </span>

                                <div className="relative">
                                    <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full bg-black/50 border border-white/10" />
                                    {p.isDrawer && (
                                        <div className="absolute -bottom-1 -right-1 bg-[var(--neon-secondary)] rounded-full p-1 border border-black shadow-[0_0_8px_rgba(255,0,85,0.5)]">
                                            <Pencil className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                    {p.hasGuessed && !p.isDrawer && (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border border-black shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white truncate text-sm">
                                        {p.name}
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)]">
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
