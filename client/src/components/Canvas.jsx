import { useRef, useState, useEffect } from 'react';
import { socket } from '../socket';
import { Eraser, Trash2, Paintbrush2, Undo2 } from 'lucide-react';

export default function Canvas({ roomCode, isDrawer, disabled }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(5);
    const [ctx, setCtx] = useState(null);
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

        // Crucial fix for mobile drawing:
        // React synthetic events are passive, which means e.preventDefault() won't stop scrolling.
        // We must attach raw DOM events with { passive: false } to guarantee drawing works on phones.
        const preventDefault = (e) => e.preventDefault();
        canvas.addEventListener('touchstart', preventDefault, { passive: false });
        canvas.addEventListener('touchmove', preventDefault, { passive: false });

        return () => {
            socket.off('draw-line', handleDrawLine);
            socket.off('clear-canvas', handleClearCanvas);
            socket.off('canvas-history', handleCanvasHistory);
            canvas.removeEventListener('touchstart', preventDefault);
            canvas.removeEventListener('touchmove', preventDefault);
        };
    }, []);

    // Helper to re-scale window resizes
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas || !ctx) return;
            // We'd ideally preserve the image data here, but for simplicity we'll just resize
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.putImageData(imageData, 0, 0);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [ctx]);

    const drawLine = (context, x0, y0, x1, y1, strokeColor, strokeWidth, fromSocket = false) => {
        if (!context) return;
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = strokeColor;
        context.lineWidth = strokeWidth;
        context.stroke();
        context.closePath();

        if (!fromSocket && isDrawer) {
            socket.emit('draw-line', {
                roomCode,
                line: { x0, y0, x1, y1, color: strokeColor, width: strokeWidth, strokeId: currentStrokeId.current }
            });
        }
    };

    const currentPos = useRef({ x: 0, y: 0 });

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        // Support touch and mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        if (!isDrawer || disabled) return;
        const { x, y } = getCoordinates(e);
        setIsDrawing(true);
        currentPos.current = { x, y };
        currentStrokeId.current = Math.random().toString(36).substring(2, 10);
    };

    const draw = (e) => {
        if (!isDrawing || !isDrawer || disabled || !ctx) return;
        const { x, y } = getCoordinates(e);

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
        <div className={`relative flex flex-col h-full w-full bg-[#1a1c29] rounded-xl overflow-hidden border ${isDrawer && !disabled ? 'border-[var(--neon-primary)]' : 'border-white/10'} shadow-lg`}>
            {/* Tools Panel */}
            <div className="flex bg-black/40 p-2 sm:p-3 border-b border-white/5 items-center justify-between z-10 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                    <div className="flex gap-1.5 bg-black/50 p-1.5 rounded-lg flex-wrap sm:flex-nowrap justify-center">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                disabled={!isDrawer || disabled}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white z-10' : 'border-transparent hover:scale-110'} ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="hidden sm:block h-6 w-px bg-white/20 mx-2"></div>

                    <button
                        onClick={() => setColor('#1a1c29')}
                        disabled={!isDrawer || disabled}
                        className={`p-2 rounded-md transition-colors ${color === '#1a1c29' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'} ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                        title="Eraser"
                    >
                        <Eraser className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <div className="flex items-center gap-2 sm:ml-4 w-full sm:w-auto mt-2 sm:mt-0 px-2 sm:px-0">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Size</span>
                        <input
                            type="range"
                            min="2" max="30"
                            value={lineWidth}
                            onChange={e => setLineWidth(Number(e.target.value))}
                            disabled={!isDrawer || disabled}
                            className={`w-full sm:w-24 accent-[var(--neon-primary)] ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full justify-end sm:w-auto">
                    <button
                        onClick={undoLine}
                        disabled={!isDrawer || disabled}
                        className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 hover:text-yellow-300 rounded-lg border border-yellow-500/20 transition-colors ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                    >
                        <Undo2 className="w-4 h-4" />
                        UNDO
                    </button>

                    <button
                        onClick={clearCanvas}
                        disabled={!isDrawer || disabled}
                        className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 rounded-lg border border-red-500/20 transition-colors ${(!isDrawer || disabled) && 'opacity-50 cursor-not-allowed'}`}
                    >
                        <Trash2 className="w-4 h-4" />
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
