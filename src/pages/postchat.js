/**
 * Post-Chat Page — Shared chat log + mutual save.
 * Both users must agree to save for data to persist.
 */
import { socketService } from '../services/socket.js';
import { createMoodSelector } from '../components/moodSelector.js';
import { createNoteEditor } from '../components/noteEditor.js';
import { showToast } from '../components/toast.js';

let _saveListeners = {};

export function renderPostChat(app, router, data = {}) {
  const duration = data.duration || 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const formattedDuration = `${mins}m ${secs}s`;
  const messages = data.messages || [];
  const pid = data.partnerId || null;

  // Clean up previous listeners
  cleanupPostChat();

  app.innerHTML = `
    <div class="postchat-page">
      <div class="postchat-container">
        <div class="postchat-header">
          <div class="chat-duration">🕐 ${formattedDuration}</div>
          <h2>That was meaningful ✦</h2>
          <p>Save a shared memory from this conversation.</p>
        </div>

        ${messages.length > 0 ? `
        <div class="postchat-section">
          <div class="postchat-section-label">Shared Chat Log</div>
          <div class="shared-chat-log" id="shared-chat-log">
            ${messages.map(msg => `
              <div class="shared-msg ${msg.self ? 'shared-msg-self' : 'shared-msg-other'}">
                <span class="shared-msg-sender">${msg.self ? 'You' : 'Stranger'}</span>
                <span class="shared-msg-text">${escapeHtml(msg.text)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : `
        <div class="postchat-section" style="text-align: center; color: var(--text-muted); padding: var(--space-lg);">
          <p>No text messages exchanged</p>
        </div>
        `}

        <div class="postchat-section">
          <div class="postchat-section-label">How did this feel?</div>
          <div id="mood-container"></div>
        </div>

        <div class="postchat-section">
          <div class="postchat-section-label">Leave a note</div>
          <div id="note-container"></div>
        </div>

        <div class="postchat-actions" id="postchat-actions">
          <button class="btn btn-secondary" id="postchat-skip">Don't Save</button>
          <button class="btn btn-primary" id="postchat-save">Save Memory</button>
        </div>

        <!-- Waiting state (hidden by default) -->
        <div class="postchat-waiting" id="postchat-waiting" style="display: none;">
          <div class="waiting-spinner"></div>
          <p>Waiting for your partner's decision...</p>
          <span style="font-size: var(--text-xs); color: var(--text-muted);">Both must agree to save</span>
        </div>

        <!-- Result state (hidden by default) -->
        <div class="postchat-result" id="postchat-result" style="display: none;"></div>

        <p class="postchat-disclaimer">
          ✦ Both users must agree to save. If either chooses "Don't Save", all data is discarded.
        </p>
      </div>
    </div>
  `;

  // Mount mood selector
  const moodSelector = createMoodSelector();
  document.getElementById('mood-container').appendChild(moodSelector.element);

  // Mount note editor
  const noteEditor = createNoteEditor();
  document.getElementById('note-container').appendChild(noteEditor.element);

  // Set up save-result listener
  _saveListeners.onSaveResult = ({ saved, messages: savedMsgs }) => {
    const resultEl = document.getElementById('postchat-result');
    const waitingEl = document.getElementById('postchat-waiting');

    if (waitingEl) waitingEl.style.display = 'none';

    if (saved) {
      if (resultEl) {
        resultEl.style.display = '';
        resultEl.innerHTML = `
          <div class="save-result-success">
            <span class="save-result-icon">✦</span>
            <h3>Memory Saved!</h3>
            <p>Both of you chose to save this conversation.</p>
            <button class="btn btn-primary" id="btn-go-journal">View Journal</button>
            <button class="btn btn-secondary" id="btn-go-home" style="margin-top: var(--space-sm);">Home</button>
          </div>
        `;
        document.getElementById('btn-go-journal')?.addEventListener('click', () => {
          router.navigate('journal');
        });
        document.getElementById('btn-go-home')?.addEventListener('click', () => {
          router.navigate('home');
        });
      }
      showToast('Memory saved to your journal ✦', 'success');
    } else {
      if (resultEl) {
        resultEl.style.display = '';
        resultEl.innerHTML = `
          <div class="save-result-discarded">
            <span class="save-result-icon">✕</span>
            <h3>Conversation Discarded</h3>
            <p>Your partner chose not to save. All data has been deleted.</p>
            <button class="btn btn-primary" id="btn-go-home2">Back to Home</button>
          </div>
        `;
        document.getElementById('btn-go-home2')?.addEventListener('click', () => {
          router.navigate('home');
        });
      }
      showToast('Conversation discarded — your partner chose not to save.', 'info');
    }
  };

  _saveListeners.onSaveWaiting = () => {
    // Already showing waiting state
  };

  socketService.on('save-result', _saveListeners.onSaveResult);
  socketService.on('save-waiting', _saveListeners.onSaveWaiting);

  // ── Button Handlers ──
  document.getElementById('postchat-skip')?.addEventListener('click', () => {
    emitVote(pid, false, null, null, null);
    showWaitingOrRedirect(router, false);
  });

  document.getElementById('postchat-save')?.addEventListener('click', () => {
    const mood = moodSelector.getSelected();
    const note = noteEditor.getNote();
    const noteType = noteEditor.getNoteType();

    if (!mood && !note) {
      showToast('Select a mood or write a note to save.', 'info');
      return;
    }

    emitVote(pid, true, mood, note, noteType);
    showWaitingOrRedirect(router, true);
  });
}

function emitVote(pid, save, mood, note, noteType) {
  socketService.emit('save-vote', {
    partnerId: pid,
    save,
    mood,
    note,
    noteType,
  });
}

function showWaitingOrRedirect(router, userSaved) {
  const actionsEl = document.getElementById('postchat-actions');
  const waitingEl = document.getElementById('postchat-waiting');

  if (actionsEl) actionsEl.style.display = 'none';

  if (userSaved) {
    // Show waiting spinner
    if (waitingEl) waitingEl.style.display = '';
  } else {
    // User chose not to save — show waiting briefly then allow redirect
    if (waitingEl) {
      waitingEl.style.display = '';
      waitingEl.querySelector('p').textContent = 'Notifying your partner...';
    }
    // If no result in 5s, redirect home
    setTimeout(() => {
      const resultEl = document.getElementById('postchat-result');
      if (resultEl && resultEl.style.display === 'none') {
        router.navigate('home');
      }
    }, 5000);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function cleanupPostChat() {
  if (_saveListeners.onSaveResult) socketService.off('save-result', _saveListeners.onSaveResult);
  if (_saveListeners.onSaveWaiting) socketService.off('save-waiting', _saveListeners.onSaveWaiting);
  _saveListeners = {};
}
