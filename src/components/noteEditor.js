/**
 * Note editor component — "What I learned" / "Advice from a stranger"
 */
export function createNoteEditor() {
    const container = document.createElement('div');
    let activeType = 'learned';

    container.innerHTML = `
    <div class="note-type-tabs">
      <button class="note-tab active" data-type="learned">💡 What I learned</button>
      <button class="note-tab" data-type="advice">🤝 Advice from a stranger</button>
    </div>
    <textarea 
      id="postchat-note" 
      class="form-textarea" 
      placeholder="Write something meaningful from this conversation..."
      maxlength="500"
      style="width: 100%;"
    ></textarea>
    <div style="display: flex; justify-content: flex-end; margin-top: var(--space-xs);">
      <span class="form-hint"><span id="note-chars">0</span>/500</span>
    </div>
  `;

    // Tab switching
    container.querySelectorAll('.note-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.note-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            activeType = tab.dataset.type;

            const textarea = container.querySelector('#postchat-note');
            textarea.placeholder = activeType === 'learned'
                ? 'Write something meaningful from this conversation...'
                : 'What advice did this stranger share with you?';
        });
    });

    // Character counter
    const textarea = container.querySelector('#postchat-note');
    textarea.addEventListener('input', () => {
        container.querySelector('#note-chars').textContent = textarea.value.length;
    });

    return {
        element: container,
        getNote: () => textarea.value,
        getNoteType: () => activeType,
    };
}
