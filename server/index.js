import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleConnections } from './rooms.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*', // For free hosting & local dev
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Scribble Game Server is running!');
});

handleConnections(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
