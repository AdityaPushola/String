/**
 * Search Page — Search bar + trending topics.
 */
import { createSearchBar, createTrendingChips } from '../components/searchBar.js';
import { searchTopics, fetchTopics } from '../services/storage.js';

export function renderSearch(app, router) {
    app.innerHTML = `
    <div class="search-page">
      <div class="journal-header">
        <h1>🔍 Explore Topics</h1>
        <button class="btn btn-ghost" id="search-back">← Back</button>
      </div>

      <div id="search-bar-container"></div>

      <div id="search-results" style="margin-bottom: var(--space-xl);"></div>

      <div>
        <div class="search-section-title">🔥 Trending Now</div>
        <div id="trending-results" class="search-topics-grid"></div>
      </div>

      <div style="margin-top: var(--space-xl);">
        <div class="search-section-title">📚 All Topics</div>
        <div id="all-topics" class="search-topics-grid"></div>
      </div>
    </div>
  `;

    // Mount search bar
    const searchBar = createSearchBar();
    document.getElementById('search-bar-container').appendChild(searchBar);

    // Search results handler
    searchBar.addEventListener('search-results', (e) => {
        const results = e.detail;
        const container = document.getElementById('search-results');
        if (results.length > 0) {
            container.innerHTML = results.map((t) => renderTopicCard(t)).join('');
            attachTopicListeners(container, router);
        } else {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: var(--text-sm);">No matching topics found.</p>';
        }
    });

    // Load trending
    createTrendingChips((topic) => {
        router.navigate('chat', { topic: topic.text });
    }).then((chips) => {
        document.getElementById('trending-results').appendChild(chips);
    });

    // Load all topics
    loadAllTopics(router);

    // Back
    document.getElementById('search-back').addEventListener('click', () => {
        router.navigate('home');
    });
}

async function loadAllTopics(router) {
    try {
        const res = await fetch('/api/topics/all');
        const topics = await res.json();
        const container = document.getElementById('all-topics');
        if (container) {
            container.innerHTML = topics.map((t) => renderTopicCard(t)).join('');
            attachTopicListeners(container, router);
        }
    } catch (err) {
        // Silent
    }
}

function renderTopicCard(topic) {
    return `
    <div class="card topic-card" data-topic="${topic.text}" role="button" tabindex="0">
      <div class="topic-text">${topic.text}</div>
      <div class="topic-category">${topic.category}</div>
    </div>
  `;
}

function attachTopicListeners(container, router) {
    container.querySelectorAll('.topic-card').forEach((card) => {
        card.addEventListener('click', () => {
            router.navigate('chat', { topic: card.dataset.topic });
        });
    });
}
