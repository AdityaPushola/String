/**
 * Search bar component with trending chips.
 */
import { fetchTopics, searchTopics } from '../services/storage.js';

export function createSearchBar(onTopicClick) {
    const wrapper = document.createElement('div');
    wrapper.className = 'search-input-wrapper';
    wrapper.innerHTML = `
    <span class="search-icon">🔍</span>
    <input 
      type="text" 
      id="search-input" 
      placeholder="What do you want to talk about?"
      autocomplete="off"
    />
  `;

    let debounceTimer;
    const input = wrapper.querySelector('#search-input');

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const q = input.value.trim();
            if (onTopicClick && q) {
                const results = await searchTopics(q);
                // Dispatch custom event with results
                wrapper.dispatchEvent(new CustomEvent('search-results', { detail: results }));
            }
        }, 300);
    });

    return wrapper;
}

export async function createTrendingChips(onClick) {
    const container = document.createElement('div');
    container.className = 'trending-chips';

    const topics = await fetchTopics();

    topics.forEach((topic) => {
        const chip = document.createElement('button');
        chip.className = 'chip chip-topic';
        chip.textContent = topic.text;
        chip.addEventListener('click', () => {
            if (onClick) onClick(topic);
        });
        container.appendChild(chip);
    });

    return container;
}
