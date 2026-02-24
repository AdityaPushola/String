/**
 * Journal Page — Saved conversations with mood badges and notes.
 */
import { getLocalChats, deleteChat } from '../services/storage.js';
import { showToast } from '../components/toast.js';

const MOOD_CONFIG = {
    happy: { emoji: '😊', label: 'Happy', badge: 'badge-happy' },
    deep: { emoji: '🌊', label: 'Deep', badge: 'badge-deep' },
    funny: { emoji: '😄', label: 'Funny', badge: 'badge-funny' },
    serious: { emoji: '🎯', label: 'Serious', badge: 'badge-serious' },
};

const NOTE_TYPES = {
    learned: '💡 What I learned',
    advice: '🤝 Advice from a stranger',
};

export function renderJournal(app, router) {
    const chats = getLocalChats().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    app.innerHTML = `
    <div class="journal-page">
      <div class="journal-header">
        <h1>📝 Your Journal</h1>
        <button class="btn btn-ghost" id="journal-back">← Back</button>
      </div>

      ${chats.length === 0 ? `
        <div class="journal-empty">
          <span class="empty-icon">📖</span>
          <h3 style="margin-bottom: 8px;">No memories yet</h3>
          <p>Start a chat and save something meaningful.<br/>Your journal will fill up with wisdom from strangers.</p>
          <button class="btn btn-primary" id="journal-start-chat" style="margin-top: 24px;">
            ✦ Start Chatting
          </button>
        </div>
      ` : `
        <div class="journal-list" id="journal-list">
          ${chats.map((chat) => renderEntry(chat)).join('')}
        </div>
      `}
    </div>
  `;

    // Back button
    document.getElementById('journal-back').addEventListener('click', () => {
        router.navigate('home');
    });

    // Start chat from empty state
    document.getElementById('journal-start-chat')?.addEventListener('click', () => {
        router.navigate('chat');
    });

    // Delete buttons
    document.querySelectorAll('[data-delete-chat]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const chatId = btn.dataset.deleteChat;
            await deleteChat(chatId);
            showToast('Memory removed.', 'info');
            renderJournal(app, router); // Re-render
        });
    });
}

function renderEntry(chat) {
    const moodInfo = MOOD_CONFIG[chat.mood] || null;
    const noteTypeLabel = NOTE_TYPES[chat.noteType] || '';
    const date = new Date(chat.savedAt);
    const timeStr = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
    const durationMins = Math.floor((chat.duration || 0) / 60);
    const durationSecs = (chat.duration || 0) % 60;

    return `
    <div class="card journal-entry">
      <div class="journal-entry-header">
        <div class="journal-entry-meta">
          ${moodInfo ? `<span class="badge ${moodInfo.badge}">${moodInfo.emoji} ${moodInfo.label}</span>` : ''}
          <span class="journal-entry-duration">🕐 ${durationMins}m ${durationSecs}s</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="journal-entry-time">${timeStr}</span>
          <button class="btn btn-icon-sm btn-ghost" data-delete-chat="${chat.id}" title="Delete">🗑️</button>
        </div>
      </div>
      ${chat.note ? `
        <div class="journal-entry-note">
          ${noteTypeLabel ? `<div class="journal-entry-note-type">${noteTypeLabel}</div>` : ''}
          "${chat.note}"
        </div>
      ` : ''}
    </div>
  `;
}
