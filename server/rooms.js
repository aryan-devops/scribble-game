import { v4 as uuidv4 } from 'uuid';
import { startGame, nextTurn, endGame, checkGuess, getPublicRoom } from './gameLoop.js';

export const rooms = new Map();

const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const handleConnections = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('create-room', ({ playerName, avatar }, callback) => {
            const roomCode = generateRoomCode();
            const player = {
                id: socket.id,
                name: playerName,
                avatar: avatar || '',
                score: 0,
                isDrawer: false,
                hasGuessed: false
            };

            const room = {
                code: roomCode,
                players: [player],
                status: 'waiting',
                currentRound: 0,
                totalRounds: 3,
                currentWord: '',
                wordChoices: [],
                drawerIndex: 0,
                messages: [],
                lines: [],
                roundEndTime: null
            };

            rooms.set(roomCode, room);

            socket.join(roomCode);
            callback({ success: true, roomCode, player, room: getPublicRoom(room) });
            io.to(roomCode).emit('room-update', getPublicRoom(room));
        });

        socket.on('join-room', ({ roomCode, playerName, avatar }, callback) => {
            const room = rooms.get(roomCode);
            if (!room) {
                return callback({ success: false, message: 'Room not found' });
            }

            let player = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());

            if (player) {
                // Reconnection: update their socket ID instead of kicking them for duplicate
                player.id = socket.id;
                socket.join(roomCode);
                callback({ success: true, roomCode, player, room: getPublicRoom(room) });

                socket.emit('canvas-history', room.lines);
                return;
            }

            if (room.players.length >= 10) {
                return callback({ success: false, message: 'Room is full' });
            }

            player = {
                id: socket.id,
                name: playerName,
                avatar: avatar || '',
                score: 0,
                isDrawer: false,
                hasGuessed: false
            };

            room.players.push(player);
            socket.join(roomCode);

            callback({ success: true, roomCode, player, room: getPublicRoom(room) });
            io.to(roomCode).emit('room-update', getPublicRoom(room));
            io.to(roomCode).emit('system-message', { text: `${playerName} joined the room!`, type: 'info' });

            // Send new player the current drawing progress
            socket.emit('canvas-history', room.lines);
        });

        socket.on('send-message', ({ roomCode, text }) => {
            const room = rooms.get(roomCode);
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player) return;

            if (room.status === 'drawing' && !player.isDrawer) {
                const isCorrect = checkGuess(room, player, text);
                if (isCorrect) {
                    io.to(roomCode).emit('system-message', { text: `${player.name} guessed the word!`, type: 'success' });
                    io.to(roomCode).emit('room-update', getPublicRoom(room));

                    // User requested: reset the canvas and clear history on correct guess
                    room.lines = [];
                    io.to(roomCode).emit('clear-canvas');

                    const notDrawers = room.players.filter(p => !p.isDrawer);
                    if (notDrawers.length > 0 && notDrawers.every(p => p.hasGuessed)) {
                        io.to(roomCode).emit('system-message', { text: `Everyone guessed the word!`, type: 'info' });
                        nextTurn(io, room);
                    }
                    return;
                }
            }

            const message = { id: uuidv4(), sender: player.name, text, system: false };
            room.messages.push(message);
            io.to(roomCode).emit('chat-message', message);
        });

        socket.on('draw-line', ({ roomCode, line }) => {
            const room = rooms.get(roomCode);
            if (!room) return;
            room.lines.push(line);
            socket.to(roomCode).emit('draw-line', line);
        });

        socket.on('undo', ({ roomCode }) => {
            const room = rooms.get(roomCode);
            if (!room || room.lines.length === 0) return;

            const lastStrokeId = room.lines[room.lines.length - 1].strokeId;
            if (lastStrokeId) {
                room.lines = room.lines.filter(l => l.strokeId !== lastStrokeId);
            } else {
                // Fallback for lines without strokeId
                room.lines.pop();
            }

            io.to(roomCode).emit('canvas-history', room.lines);
        });

        socket.on('clear-canvas', ({ roomCode }) => {
            const room = rooms.get(roomCode);
            if (!room) return;
            room.lines = [];
            io.to(roomCode).emit('clear-canvas');
        });

        socket.on('start-game', ({ roomCode }) => {
            console.log(`[DEBUG] start-game requested for room ${roomCode} by socket ${socket.id}`);
            const room = rooms.get(roomCode);
            if (!room) {
                console.log(`[DEBUG] Room not found.`);
                return;
            }
            console.log(`[DEBUG] Room host ID: ${room.players[0].id}. Is match? ${room.players[0].id === socket.id}`);

            if (room && room.players[0].id === socket.id) {
                console.log(`[DEBUG] Starting game for room ${roomCode}`);
                startGame(io, room);
            }
        });

        socket.on('word-selected', ({ roomCode, word }) => {
            const room = rooms.get(roomCode);
            if (room && room.players.find(p => p.id === socket.id)?.isDrawer) {
                room.currentWord = word;
                room.status = 'drawing';
                room.roundEndTime = Date.now() + 60000;
                io.to(roomCode).emit('room-update', getPublicRoom(room));
                io.to(roomCode).emit('system-message', { text: `Drawer has selected a word!`, type: 'info' });

                room.turnTimer = setTimeout(() => {
                    if (room.status === 'drawing') {
                        io.to(roomCode).emit('system-message', { text: `Time's up! The word was ${room.currentWord}`, type: 'error' });
                        nextTurn(io, room);
                    }
                }, 60000);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            for (const [code, room] of rooms.entries()) {
                const playerIndex = room.players.findIndex(p => p.id === socket.id);
                if (playerIndex !== -1) {
                    const player = room.players[playerIndex];
                    room.players.splice(playerIndex, 1);

                    if (room.players.length === 0) {
                        if (room.turnTimer) clearTimeout(room.turnTimer);
                        if (room.chooseTimer) clearTimeout(room.chooseTimer);
                        rooms.delete(code);
                    } else {
                        io.to(code).emit('system-message', { text: `${player.name} left the game`, type: 'error' });
                        io.to(code).emit('room-update', getPublicRoom(room));
                        if (player.isDrawer && room.status === 'drawing') {
                            io.to(code).emit('system-message', { text: `Drawer left! Turn ended.`, type: 'error' });
                            if (room.turnTimer) clearTimeout(room.turnTimer);
                            nextTurn(io, room);
                        } else if (!player.isDrawer && room.status === 'drawing') {
                            const notDrawers = room.players.filter(p => !p.isDrawer);
                            if (notDrawers.length > 0 && notDrawers.every(p => p.hasGuessed)) {
                                if (room.turnTimer) clearTimeout(room.turnTimer);
                                nextTurn(io, room);
                            }
                        }
                    }
                    break;
                }
            }
        });
    });
};
