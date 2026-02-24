/**
 * Storage service — localStorage + API sync.
 * Manages session tokens, saved chats, and preferences.
 */

const SESSION_KEY = 'string_session_token';
const CHATS_KEY = 'string_saved_chats';

/**
 * Get or create session token
 */
export function getSessionToken() {
    let token = localStorage.getItem(SESSION_KEY);
    if (!token) {
        token = 'sess_' + crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, token);
    }
    return token;
}

/**
 * Save a chat entry locally and to API
 */
export async function saveChat(chatData) {
    const token = getSessionToken();
    const entry = { ...chatData, sessionToken: token };

    // Save to localStorage
    const chats = getLocalChats();
    chats.push(entry);
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));

    // Sync to API
    try {
        const res = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
        });
        if (res.ok) {
            const saved = await res.json();
            // Update local entry with server ID
            entry.id = saved.id;
            localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
        }
    } catch (err) {
        console.warn('[STORAGE] API sync failed, data saved locally');
    }

    return entry;
}

/**
 * Get all saved chats from localStorage
 */
export function getLocalChats() {
    try {
        return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Delete a chat entry
 */
export async function deleteChat(chatId) {
    const token = getSessionToken();
    let chats = getLocalChats();
    chats = chats.filter((c) => c.id !== chatId);
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));

    try {
        await fetch(`/api/chats/${token}/${chatId}`, { method: 'DELETE' });
    } catch (err) {
        // Silent
    }
}

/**
 * Submit an abuse report
 */
export async function submitReport(reportData) {
    const token = getSessionToken();
    try {
        const res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...reportData, reporterSession: token }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Fetch trending topics
 */
export async function fetchTopics() {
    try {
        const res = await fetch('/api/topics');
        if (res.ok) return await res.json();
    } catch { }
    return [];
}

/**
 * Search topics
 */
export async function searchTopics(query) {
    try {
        const res = await fetch(`/api/topics/search?q=${encodeURIComponent(query)}`);
        if (res.ok) return await res.json();
    } catch { }
    return [];
}
