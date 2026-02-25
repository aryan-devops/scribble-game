import { io } from 'socket.io-client';

// Construct URL dynamically to support testing on phones over Local Area Network
const serverHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const URL = import.meta.env.VITE_SERVER_URL || `http://${serverHost}:3001`;

export const socket = io(URL, {
    autoConnect: true,
    reconnection: true,
});
