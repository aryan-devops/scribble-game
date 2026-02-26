import { useRef, useState, useEffect } from 'react';
import { socket } from '../socket';
import { Eraser, Trash2, Paintbrush2, Undo2, Palette } from 'lucide-react';

export default function Canvas({ roomCode, isDrawer, disabled }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(5);
    const [ctx, setCtx] = useState(null);
    const [showPalette, setShowPalette] = useState(false);
    const currentStrokeId = useRef(null);

    const colors = [
        '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080', '#008000', '#a52a2a'
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set actual size in memory (scaled to account for high DPI devices)
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';
        setCtx(context);

        // Socket events
        const handleDrawLine = (line) => {
            // line = { x0, y0, x1, y1, color, width }
            drawLine(context, line.x0, line.y0, line.x1, line.y1, line.color, line.width, true);
        };

        const handleClearCanvas = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
        };

        const handleCanvasHistory = (lines) => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            lines.forEach(line => {
                drawLine(context, line.x0, line.y0, line.x1, line.y1, line.color, line.width, true);
            });
        };

        socket.on('draw-line', handleDrawLine);
        socket.on('clear-canvas', handleClearCanvas);
        socket.on('canvas-history', handleCanvasHistory);

        return () => {
            socket.off('draw-line', handleDrawLine);
            socket.off('clear-canvas', handleClearCanvas);
            socket.off('canvas-history', handleCanvasHistory);
        };
    }, []);

    // Helper to re-scale window resizes without losing image
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas || !ctx) return;

            // Save current image data as a data URL before resize memory flush
            const imgData = canvas.toDataURL();

            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Restore image onto the newly scaled canvas
            const img = new Image();
            img.src = imgData;
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [ctx]);

    const drawLine = (context, x0_pct, y0_pct, x1_pct, y1_pct, strokeColor, strokeWidth, fromSocket = false) => {
        if (!context) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Convert incoming percentage [0..1] back mapping to actual pixel width of THIS specific device
        const actualX0 = x0_pct * canvas.width;
        const actualY0 = y0_pct * canvas.height;
        const actualX1 = x1_pct * canvas.width;
        const actualY1 = y1_pct * canvas.height;

        context.beginPath();
        context.moveTo(actualX0, actualY0);
        context.lineTo(actualX1, actualY1);
        context.strokeStyle = strokeColor;
        // Scale stroke thickness slightly based on standard 800px width so strokes look proportional on small screens
        context.lineWidth = strokeWidth * (canvas.width / 800);
        context.stroke();
        context.closePath();

        if (!fromSocket && isDrawer) {
            socket.emit('draw-line', {
                roomCode,
                line: { x0: x0_pct, y0: y0_pct, x1: x1_pct, y1: y1_pct, color: strokeColor, width: strokeWidth, strokeId: currentStrokeId.current }
            });
        }
    };

    const currentPos = useRef({ x: 0, y: 0 });

    const getNormalizedCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        // Support touch and mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Get exact pixel location clicked
        const pixelX = clientX - rect.left;
        const pixelY = clientY - rect.top;

        // Convert coordinate to a normalized percentage (0.0 to 1.0)
        // This guarantees strokes represent exactly the same proportional spot across any phone or monitor
        return {
            x: pixelX / rect.width,
            y: pixelY / rect.height
        };
    };

    const startDrawing = (e) => {
        if (!isDrawer || disabled) return;
        // e.preventDefault() can prevent scrolling while drawing on mobile
        if (e.cancelable) e.preventDefault();

        const { x, y } = getNormalizedCoordinates(e);
        setIsDrawing(true);
        currentPos.current = { x, y };
        currentStrokeId.current = Math.random().toString(36).substring(2, 10);
    };

    const draw = (e) => {
        if (!isDrawing || !isDrawer || disabled || !ctx) return;
        if (e.cancelable) e.preventDefault();

        const { x, y } = getNormalizedCoordinates(e);

        drawLine(ctx, currentPos.current.x, currentPos.current.y, x, y, color, lineWidth);
        currentPos.current = { x, y };
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        if (!isDrawer || disabled) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        socket.emit('clear-canvas', { roomCode });
    };

    const undoLine = () => {
        if (!isDrawer || disabled) return;
        socket.emit('undo', { roomCode });
    };

    return (
        <div className={`relative flex flex-col flex-1 w-full h-full bg-[#1a1c29] rounded-xl overflow-hidden border ${isDrawer && !disabled ? 'border-[var(--neon-primary)]' : 'border-white/10'} shadow-lg`}>
            {/* Tools Panel */}
            <div className="flex bg-black/40 p-1.5 sm:p-3 border-b border-white/5 items-center justify-between z-10 flex-wrap gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1">

                    {/* Mobile Palette Toggle */}
                    <div className="sm:hidden relative">
                        <button
                            onClick={() => setShowPalette(!showPalette)}
                            disabled={!isDrawer || disabled}
                            className={`p-1.5 rounded-md transition-colors bg-white/10 hover:bg-white/20 text-white ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                            title="Colors"
                        >
                            <Palette className="w-4 h-4" />
                        </button>

                        {/* Mobile Flyout Palette */}
                        {showPalette && (
                            <div className="absolute top-full left-0 mt-2 p-2 bg-black/90 border border-white/20 rounded-lg shadow-xl grid grid-cols-4 gap-2 z-50 w-40 glass-panel">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => { setColor(c); setShowPalette(false); }}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop Inline Palette */}
                    <div className="hidden sm:flex gap-1 sm:gap-1.5 bg-black/50 p-1 sm:p-1.5 rounded-lg flex-nowrap justify-center">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                disabled={!isDrawer || disabled}
                                className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white z-10' : 'border-transparent hover:scale-110'} ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="hidden sm:block h-6 w-px bg-white/20 mx-1 sm:mx-2"></div>

                    <button
                        onClick={() => setColor('#1a1c29')}
                        disabled={!isDrawer || disabled}
                        className={`p-1.5 sm:p-2 rounded-md transition-colors ${color === '#1a1c29' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'} ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                        title="Eraser"
                    >
                        <Eraser className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>

                    <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4 flex-1 sm:w-auto px-1 sm:px-0">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">Size</span>
                        <input
                            type="range"
                            min="2" max="30"
                            value={lineWidth}
                            onChange={e => setLineWidth(Number(e.target.value))}
                            disabled={!isDrawer || disabled}
                            className={`w-16 sm:w-24 h-1 sm:h-2 accent-[var(--neon-primary)] ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-0 w-full justify-end sm:w-auto">
                    <button
                        onClick={undoLine}
                        disabled={!isDrawer || disabled}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-xs font-bold text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 hover:text-yellow-300 rounded-lg border border-yellow-500/20 transition-colors ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                    >
                        <Undo2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        UNDO
                    </button>

                    <button
                        onClick={clearCanvas}
                        disabled={!isDrawer || disabled}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 rounded-lg border border-red-500/20 transition-colors ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                    >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        CLEAR
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative w-full h-full cursor-crosshair touch-none">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                />

                {(!isDrawer && !disabled) && (
                    <div className="absolute top-2 left-2 pointer-events-none bg-black/50 glass-panel border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <Paintbrush2 className="w-4 h-4 text-[var(--neon-primary)] animate-pulse" />
                        <span className="text-sm font-medium">Guess the drawing!</span>
                    </div>
                )}

                {disabled && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm z-20">
                        <div className="text-2xl font-bold tracking-widest text-white/50 uppercase">Waiting...</div>
                    </div>
                )}
            </div>
        </div>
    );
}
