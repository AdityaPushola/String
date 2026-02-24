/**
 * STRING — Main Application Entry Point.
 * Initializes router, registers pages, manages global state.
 */
import { Router } from './services/router.js';
import { getSessionToken } from './services/storage.js';
import { renderLanding } from './pages/landing.js';
import { renderChat, cleanupChat } from './pages/chat.js';
import { renderPostChat } from './pages/postchat.js';
import { renderJournal } from './pages/journal.js';
import { renderSearch } from './pages/search.js';

// ─── Initialize ────────────────────────────────────────────────────────
const router = new Router();

// Ensure session token exists
getSessionToken();

// ─── Register Routes ───────────────────────────────────────────────────
router.route('home', (app) => {
    cleanupChat();
    renderLanding(app, router);
});

router.route('chat', (app, data) => {
    renderChat(app, router, data);
});

router.route('postchat', (app, data) => {
    cleanupChat();
    renderPostChat(app, router, data);
});

router.route('journal', (app) => {
    cleanupChat();
    renderJournal(app, router);
});

router.route('search', (app) => {
    cleanupChat();
    renderSearch(app, router);
});

// ─── Start ─────────────────────────────────────────────────────────────
router.start();

// ─── Handle Page Visibility ────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Could pause moderation when tab is hidden to save resources
        console.log('[APP] Tab hidden');
    } else {
        console.log('[APP] Tab visible');
    }
});

// ─── Handle Before Unload ──────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
    cleanupChat();
});

console.log('✦ STRING initialized');
