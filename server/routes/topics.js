import { Router } from 'express';

const router = Router();

// Curated conversation starters / trending topics
const TOPICS = [
    { id: 1, text: 'What\'s a life lesson you learned the hard way?', category: 'deep', trending: true },
    { id: 2, text: 'What would you do with an extra hour every day?', category: 'thoughtful', trending: true },
    { id: 3, text: 'What\'s the best advice you\'ve ever received?', category: 'advice', trending: true },
    { id: 4, text: 'Describe your perfect day in 3 sentences', category: 'fun', trending: true },
    { id: 5, text: 'What\'s something you believe that most people don\'t?', category: 'deep', trending: true },
    { id: 6, text: 'If you could master any skill overnight, what would it be?', category: 'fun', trending: false },
    { id: 7, text: 'What\'s one thing you wish you could tell your younger self?', category: 'deep', trending: true },
    { id: 8, text: 'What makes a conversation truly meaningful?', category: 'thoughtful', trending: true },
    { id: 9, text: 'Share a moment that changed your perspective on life', category: 'deep', trending: false },
    { id: 10, text: 'What\'s the most underrated thing in life?', category: 'thoughtful', trending: true },
    { id: 11, text: 'If you could have dinner with anyone, who and why?', category: 'fun', trending: false },
    { id: 12, text: 'What\'s your hot take that you\'ll defend forever?', category: 'fun', trending: true },
    { id: 13, text: 'What does happiness mean to you right now?', category: 'deep', trending: false },
    { id: 14, text: 'What\'s a small act of kindness you\'ll never forget?', category: 'advice', trending: true },
    { id: 15, text: 'What book, movie, or song changed your life?', category: 'fun', trending: false },
];

// GET /api/topics — Get trending topics
router.get('/', (req, res) => {
    const trending = TOPICS.filter((t) => t.trending);
    // Shuffle for variety
    const shuffled = trending.sort(() => Math.random() - 0.5).slice(0, 8);
    res.json(shuffled);
});

// GET /api/topics/search — Search topics
router.get('/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    if (!q) {
        return res.json(TOPICS.slice(0, 8));
    }
    const results = TOPICS.filter(
        (t) => t.text.toLowerCase().includes(q) || t.category.includes(q)
    );
    res.json(results);
});

// GET /api/topics/all — Get all topics
router.get('/all', (req, res) => {
    res.json(TOPICS);
});

export default router;
