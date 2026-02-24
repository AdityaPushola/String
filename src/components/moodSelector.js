/**
 * Mood selector component — 4 mood options.
 */
const MOODS = [
    { id: 'happy', emoji: '😊', label: 'Happy', description: 'Lighthearted & warm' },
    { id: 'deep', emoji: '🌊', label: 'Deep', description: 'Thoughtful & profound' },
    { id: 'funny', emoji: '😄', label: 'Funny', description: 'Laughter & joy' },
    { id: 'serious', emoji: '🎯', label: 'Serious', description: 'Important & focused' },
];

export function createMoodSelector(onSelect) {
    const container = document.createElement('div');
    container.className = 'mood-grid';
    let selected = null;

    MOODS.forEach((mood) => {
        const option = document.createElement('button');
        option.className = 'mood-option';
        option.dataset.mood = mood.id;
        option.innerHTML = `
      <span class="mood-emoji">${mood.emoji}</span>
      <div>
        <div style="font-weight: 500;">${mood.label}</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted);">${mood.description}</div>
      </div>
    `;

        option.addEventListener('click', () => {
            container.querySelectorAll('.mood-option').forEach((o) => o.classList.remove('selected'));
            option.classList.add('selected');
            selected = mood.id;
            if (onSelect) onSelect(mood.id);
        });

        container.appendChild(option);
    });

    return { element: container, getSelected: () => selected };
}
