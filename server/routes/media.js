import { Router } from 'express';
import multer from 'multer';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, statSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = join(__dirname, '..', 'data', 'media');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, MEDIA_DIR),
    filename: (req, file, cb) => {
        const ext = extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = /image\/(jpeg|png|gif|webp)|audio\/(webm|mp3|ogg|wav)/;
        if (allowed.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    },
});

const router = Router();

// POST /api/media — Upload ephemeral media
router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const mediaInfo = {
        id: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        type: req.file.mimetype.startsWith('image') ? 'image' : 'audio',
        size: req.file.size,
        uploadedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    res.status(201).json(mediaInfo);
});

// GET /api/media/:id — Check if media exists and not expired
router.get('/:id', (req, res) => {
    const filePath = join(MEDIA_DIR, req.params.id);
    if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'Media not found or expired' });
    }

    const stat = statSync(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs > 24 * 60 * 60 * 1000) {
        return res.status(410).json({ error: 'Media expired' });
    }

    res.json({
        id: req.params.id,
        url: `/uploads/${req.params.id}`,
        expiresIn: Math.max(0, 24 * 60 * 60 * 1000 - ageMs),
    });
});

export default router;
