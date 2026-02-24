import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHATS_DIR = join(__dirname, '..', 'data', 'chats');

const router = Router();

// POST /api/chats — Save a chat entry
router.post('/', (req, res) => {
    try {
        const { sessionToken, mood, note, noteType, duration, partnerId } = req.body;

        if (!sessionToken) {
            return res.status(400).json({ error: 'sessionToken is required' });
        }

        const chatEntry = {
            id: uuidv4(),
            sessionToken,
            mood: mood || null,
            note: note || '',
            noteType: noteType || 'learned', // "learned" or "advice"
            duration: duration || 0,
            partnerId: partnerId || null,
            savedAt: Date.now(),
        };

        // Save to user's chat file
        const filePath = join(CHATS_DIR, `${sessionToken}.json`);
        let chats = [];
        if (existsSync(filePath)) {
            chats = JSON.parse(readFileSync(filePath, 'utf-8'));
        }
        chats.push(chatEntry);
        writeFileSync(filePath, JSON.stringify(chats, null, 2));

        res.status(201).json(chatEntry);
    } catch (err) {
        console.error('[CHATS] Save error:', err);
        res.status(500).json({ error: 'Failed to save chat' });
    }
});

// GET /api/chats/:sessionToken — Get all saved chats
router.get('/:sessionToken', (req, res) => {
    try {
        const filePath = join(CHATS_DIR, `${req.params.sessionToken}.json`);
        if (!existsSync(filePath)) {
            return res.json([]);
        }
        const chats = JSON.parse(readFileSync(filePath, 'utf-8'));
        res.json(chats);
    } catch (err) {
        console.error('[CHATS] Read error:', err);
        res.status(500).json({ error: 'Failed to read chats' });
    }
});

// DELETE /api/chats/:sessionToken/:chatId — Delete a chat entry
router.delete('/:sessionToken/:chatId', (req, res) => {
    try {
        const filePath = join(CHATS_DIR, `${req.params.sessionToken}.json`);
        if (!existsSync(filePath)) {
            return res.status(404).json({ error: 'Not found' });
        }
        let chats = JSON.parse(readFileSync(filePath, 'utf-8'));
        chats = chats.filter((c) => c.id !== req.params.chatId);
        writeFileSync(filePath, JSON.stringify(chats, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete chat' });
    }
});

export default router;
