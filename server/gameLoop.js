import { getRandomWords } from './words.js';

export const getPublicRoom = (room) => {
    // DO NOT expose `lines` in the public room object, because it can have thousands of items 
    // and passing it continuously causes extreme network and React re-render lag!
    const { turnTimer, chooseTimer, lines, ...publicRoom } = room;

    if (publicRoom.currentWord && publicRoom.status === 'drawing') {
        const revealedLetters = publicRoom.revealedLetters || [];
        const revealed = publicRoom.revealedWords || [];

        let hint = '';
        let wordStartIndex = 0;
        const wordsLower = publicRoom.currentWord.toLowerCase().split(' ');

        // Map the \`revealedWords\` into \`revealedLetters\` temporarily for display
        for (let w of wordsLower) {
            if (revealed.includes(w)) {
                for (let i = 0; i < w.length; i++) {
                    revealedLetters[wordStartIndex + i] = true;
                }
            }
            wordStartIndex += w.length + 1; // +1 for the space
        }

        for (let i = 0; i < publicRoom.currentWord.length; i++) {
            const char = publicRoom.currentWord[i];
            if (char === ' ') {
                hint += '   ';
            } else {
                if (revealedLetters[i]) {
                    hint += char.toUpperCase() + ' ';
                } else {
                    hint += '_ ';
                }
            }
        }
        publicRoom.wordHint = hint.trimEnd();
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

    if (room.players.length === 0) return;
    if (room.drawerIndex >= room.players.length) {
        room.drawerIndex = 0;
        // If it rolled over during a disconnect, we might need to increment round,
        // but for simplicity, just wrap it gracefully so we don't crash.
    }

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
            room.roundEndTime = Date.now() + 100000;
            io.to(room.code).emit('room-update', getPublicRoom(room));
            io.to(room.code).emit('system-message', { text: `Drawer took too long, a word was randomly selected!`, type: 'info' });

            room.turnTimer = setTimeout(() => {
                if (room.status === 'drawing') {
                    io.to(room.code).emit('system-message', { text: `Time's up! The word was ${room.currentWord}`, type: 'error' });
                    nextTurn(io, room);
                }
            }, 100000);
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
        const points = Math.floor((timeLeft / 100000) * 500) + 100; // 100 to 600
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
