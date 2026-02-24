import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

import chatsRouter from './routes/chats.js';
import mediaRouter from './routes/media.js';
import topicsRouter from './routes/topics.js';
import reportsRouter from './routes/reports.js';
import { MatchingService } from './services/matching.js';
import { ExpiryService } from './services/expiry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Ensure data directories exist
mkdirSync(join(__dirname, 'data', 'chats'), { recursive: true });
mkdirSync(join(__dirname, 'data', 'media'), { recursive: true });
mkdirSync(join(__dirname, 'data', 'reports'), { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(join(__dirname, 'data', 'media')));

// API Routes
app.use('/api/chats', chatsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Socket.io Signaling + Matching + Chat ────────────────────────────
const matching = new MatchingService();

/**
 * Session chat logs — tracks text messages per paired session.
 * Key: sorted pair key `${idA}::${idB}`, Value: { messages: [], saveVotes: {} }
 */
const sessions = new Map();

function pairKey(a, b) {
    return [a, b].sort().join('::');
}

function getOrCreateSession(a, b) {
    const key = pairKey(a, b);
    if (!sessions.has(key)) {
        sessions.set(key, {
            messages: [],
            saveVotes: {},     // socketId -> { save: bool, mood, note, noteType }
            resolved: false,
        });
    }
    return { key, session: sessions.get(key) };
}

function clearSession(a, b) {
    const key = pairKey(a, b);
    sessions.delete(key);
}

io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected: ${socket.id}`);

    // ── Matching ──────────────────────────────────────────────────
    socket.on('join-queue', (preferences = {}) => {
        console.log(`[MATCH] ${socket.id} joining queue`);
        const partner = matching.addToQueue(socket.id, preferences);

        if (partner) {
            console.log(`[MATCH] Paired: ${socket.id} <-> ${partner}`);
            // Create session for this pair
            getOrCreateSession(socket.id, partner);
            socket.emit('matched', { partnerId: partner, initiator: true });
            io.to(partner).emit('matched', { partnerId: socket.id, initiator: false });
        } else {
            socket.emit('waiting');
        }
    });

    socket.on('leave-queue', () => {
        matching.removeFromQueue(socket.id);
    });

    // ── WebRTC Signaling ──────────────────────────────────────────
    socket.on('offer', ({ to, offer }) => {
        io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }) => {
        io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    // ── Text Chat ─────────────────────────────────────────────────
    socket.on('chat-message', ({ to, text }) => {
        if (!to || !text || typeof text !== 'string') return;
        const trimmed = text.trim().slice(0, 500); // Max 500 chars
        if (!trimmed) return;

        const msg = {
            id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            from: socket.id,
            text: trimmed,
            timestamp: Date.now(),
        };

        // Store in session log
        const partner = matching.getPartner(socket.id);
        if (partner) {
            const { session } = getOrCreateSession(socket.id, partner);
            session.messages.push(msg);
        }

        // Relay to partner
        io.to(to).emit('chat-message', {
            id: msg.id,
            from: socket.id,
            text: msg.text,
            timestamp: msg.timestamp,
        });

        console.log(`[CHAT] ${socket.id} -> ${to}: "${trimmed.slice(0, 30)}..."`);
    });

    // ── Save Vote (Mutual Save) ───────────────────────────────────
    socket.on('save-vote', ({ partnerId: pid, save, mood, note, noteType }) => {
        if (!pid) return;

        const { key, session } = getOrCreateSession(socket.id, pid);
        if (session.resolved) return; // Already resolved

        // Record this user's vote
        session.saveVotes[socket.id] = { save: !!save, mood, note, noteType };

        console.log(`[SAVE] ${socket.id} voted: ${save ? 'SAVE' : 'DISCARD'}`);

        // Check if both have voted
        const votes = Object.keys(session.saveVotes);
        if (votes.length >= 2) {
            session.resolved = true;
            const allSaved = Object.values(session.saveVotes).every(v => v.save);

            if (allSaved) {
                // Both saved — send shared data to both
                const result = {
                    saved: true,
                    messages: session.messages,
                    votes: session.saveVotes,
                    sessionKey: key,
                };
                io.to(votes[0]).emit('save-result', result);
                io.to(votes[1]).emit('save-result', result);
                console.log(`[SAVE] Session ${key}: BOTH SAVED ✓ (${session.messages.length} messages)`);
            } else {
                // At least one discarded — notify both
                const result = { saved: false };
                io.to(votes[0]).emit('save-result', result);
                io.to(votes[1]).emit('save-result', result);
                console.log(`[SAVE] Session ${key}: DISCARDED ✗`);
            }

            // Clean up session after a delay
            setTimeout(() => sessions.delete(key), 30000);
        } else {
            // Notify user they're waiting for their partner
            socket.emit('save-waiting');
        }
    });

    // ── Next / End ────────────────────────────────────────────────
    socket.on('next', ({ partnerId }) => {
        if (partnerId) {
            clearSession(socket.id, partnerId);
            io.to(partnerId).emit('partner-left');
        }
        matching.removeFromQueue(socket.id);
        matching.removePair(socket.id);
    });

    socket.on('end-chat', ({ partnerId }) => {
        if (partnerId) {
            io.to(partnerId).emit('partner-left');
        }
    });

    // Moderation
    socket.on('moderation-violation', ({ partnerId, type }) => {
        console.log(`[MOD] Violation from ${socket.id}: ${type}`);
        if (partnerId) {
            clearSession(socket.id, partnerId);
            io.to(partnerId).emit('partner-left');
        }
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[SOCKET] Disconnected: ${socket.id}`);
        const partnerId = matching.getPartner(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('partner-left');
            clearSession(socket.id, partnerId);
        }
        matching.removeFromQueue(socket.id);
        matching.removePair(socket.id);
    });
});

// Start expiry worker
const expiryService = new ExpiryService(join(__dirname, 'data', 'media'));
expiryService.start();

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`\n  ✦ STRING Server running on http://localhost:${PORT}\n`);
});
