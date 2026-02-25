import { useState, useEffect } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

function App() {
  const [room, setRoom] = useState(null);
  const [player, setPlayer] = useState(null);

  // Reconnect logic: if we have session info in localStorage, try to rejoin
  useEffect(() => {
    const attemptRejoin = () => {
      const savedSession = localStorage.getItem('scribble_session');
      if (savedSession) {
        try {
          const { roomCode, playerName, avatar } = JSON.parse(savedSession);
          socket.emit('join-room', { roomCode, playerName, avatar }, (res) => {
            if (res.success) {
              setRoom(res.room);
              setPlayer(res.player);
            } else {
              // Room no longer exists on the server, clear session and reset UI
              localStorage.removeItem('scribble_session');
              setRoom(null);
              setPlayer(null);
            }
          });
        } catch (e) {
          console.error("Session restore failed", e);
        }
      }
    };

    // Run on initial page load
    attemptRejoin();

    // Run whenever socket re-connects (e.g. server restarts)
    socket.on('connect', attemptRejoin);

    socket.on('room-update', (updatedRoom) => {
      console.log("[DEBUG Frontend] Received room-update:", updatedRoom.status);
      setRoom(updatedRoom);
    });

    return () => {
      socket.off('connect', attemptRejoin);
      socket.off('room-update');
    };
  }, []);

  const handleJoin = (roomData, playerData) => {
    setRoom(roomData);
    setPlayer(playerData);
    localStorage.setItem('scribble_session', JSON.stringify({
      roomCode: roomData.code,
      playerName: playerData.name,
      avatar: playerData.avatar
    }));
  };

  const handleLeave = () => {
    setRoom(null);
    setPlayer(null);
    localStorage.removeItem('scribble_session');
    socket.emit('leave-room'); // implement this on backend if needed
  };

  return (
    <div className="min-h-screen text-white relative">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-8 min-h-screen flex flex-col">
        {room ? (
          <GameRoom room={room} player={player} onLeave={handleLeave} />
        ) : (
          <Lobby onJoin={handleJoin} />
        )}
      </main>
    </div>
  );
}

export default App;
