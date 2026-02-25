import { getRandomWords } from './words.js';

export const getPublicRoom = (room) => {
    // DO NOT expose `lines` in the public room object, because it can have thousands of items 
    // and passing it continuously causes extreme network and React re-render lag!
    const { turnTimer, chooseTimer, lines, ...publicRoom } = room;

    if (publicRoom.currentWord && publicRoom.status === 'drawing') {
        const words = publicRoom.currentWord.split(' ');
        const revealed = publicRoom.revealedWords || [];

        publicRoom.wordHint = words.map(w => {
            if (revealed.includes(w.toLowerCase())) {
                return w.toUpperCase();
            } else {
                return w.replace(/[a-zA-Z0-9]/g, '_ ');
            }
        }).join('   ');
    }

    return publicRoom;
};

export const startGame = (io, room) => {
    room.currentRound = 1;
    room.status = 'choosing_word';
    room.lines = [];
    room.messages = [];
    room.revealedWords = [];
    room.players.forEach(p => { p.score = 0; p.hasGuessed = false; });

    startTurn(io, room);
};

export const startTurn = (io, room) => {
    room.lines = [];
    room.status = 'choosing_word';
    room.revealedWords = [];
    room.players.forEach(p => p.hasGuessed = false);

    room.players.forEach((p, idx) => p.isDrawer = (idx === room.drawerIndex));
    const drawer = room.players[room.drawerIndex];

    room.wordChoices = getRandomWords(3);
    room.currentWord = '';

    io.to(room.code).emit('room-update', getPublicRoom(room));
    io.to(room.code).emit('system-message', { text: `Round ${room.currentRound} - It is ${drawer.name}'s turn to draw!`, type: 'info' });
    io.to(drawer.id).emit('choose-word', room.wordChoices);

    room.chooseTimer = setTimeout(() => {
        if (room.status === 'choosing_word' && room.currentWord === '') {
            room.currentWord = room.wordChoices[0];
            room.status = 'drawing';
            room.roundEndTime = Date.now() + 60000;
            io.to(room.code).emit('room-update', getPublicRoom(room));
            io.to(room.code).emit('system-message', { text: `Drawer took too long, a word was randomly selected!`, type: 'info' });

            room.turnTimer = setTimeout(() => {
                if (room.status === 'drawing') {
                    io.to(room.code).emit('system-message', { text: `Time's up! The word was ${room.currentWord}`, type: 'error' });
                    nextTurn(io, room);
                }
            }, 60000);
        }
    }, 15000);
};

export const nextTurn = (io, room) => {
    room.drawerIndex++;
    if (room.drawerIndex >= room.players.length) {
        room.drawerIndex = 0;
        room.currentRound++;
    }

    setTimeout(() => {
        if (room.currentRound > room.totalRounds) {
            endGame(io, room);
        } else {
            startTurn(io, room);
        }
    }, 3000); // Wait 3 seconds to show the answer before next round
};

export const checkGuess = (room, player, guess) => {
    if (room.currentWord && guess.toLowerCase() === room.currentWord.toLowerCase() && !player.hasGuessed) {
        player.hasGuessed = true;

        const timeLeft = Math.max(0, room.roundEndTime - Date.now());
        const points = Math.floor((timeLeft / 60000) * 500) + 100; // 100 to 600
        player.score += points;

        const drawer = room.players.find(p => p.isDrawer);
        if (drawer) {
            drawer.score += 50;
        }

        return true;
    }
    return false;
};

export const endGame = (io, room) => {
    room.status = 'game_end';
    io.to(room.code).emit('room-update', getPublicRoom(room));
    io.to(room.code).emit('system-message', { text: `Game Over! Look at the final scores.`, type: 'info' });
};
