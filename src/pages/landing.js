/**
 * Landing Page — Hero + features + trending topics.
 */
import { createTrendingChips } from '../components/searchBar.js';

export function renderLanding(app, router) {
    app.innerHTML = `
    <div class="landing">
      <div class="landing-bg"></div>

      <!-- Navigation -->
      <nav class="landing-nav">
        <div class="landing-logo">STRING</div>
        <div class="landing-nav-links">
          <button class="btn btn-ghost" id="nav-journal">📝 Journal</button>
          <button class="btn btn-ghost" id="nav-search">🔍 Explore</button>
        </div>
      </nav>

      <!-- Hero -->
      <section class="landing-hero">
        <div class="landing-hero-tag">
          <span style="color: var(--success);">●</span>
          Safe & Anonymous
        </div>

        <h1>
          Conversations that<br/>
          <span class="gradient-text">actually matter</span>
        </h1>

        <p>
          Connect with real people through anonymous video chat. 
          No profiles, no pressure — just meaningful conversations 
          with complete strangers.
        </p>

        <div class="landing-cta-group">
          <button class="btn btn-primary btn-lg landing-cta" id="start-chat-btn">
            ✦ Start Chatting
          </button>
          <button class="btn btn-secondary btn-lg" id="explore-btn">
            Explore Topics
          </button>
        </div>
      </section>

      <!-- Features -->
      <section class="landing-features">
        <div class="card feature-card">
          <div class="feature-icon">🛡️</div>
          <h3>AI-Powered Safety</h3>
          <p>Real-time content moderation keeps every conversation safe and respectful.</p>
        </div>
        <div class="card feature-card">
          <div class="feature-icon">💬</div>
          <h3>Meaningful Moments</h3>
          <p>Save conversations, write notes, and keep the wisdom strangers share with you.</p>
        </div>
        <div class="card feature-card">
          <div class="feature-icon">🕐</div>
          <h3>Ephemeral & Private</h3>
          <p>Share voice notes and images that auto-expire in 24 hours. Your privacy matters.</p>
        </div>
      </section>

      <!-- Trending Topics -->
      <section class="landing-trending">
        <h2>🔥 Trending Conversation Starters</h2>
        <div id="trending-container"></div>
      </section>
    </div>
  `;

    // Load trending topics
    createTrendingChips((topic) => {
        // Navigate to chat with a conversation starter
        router.navigate('chat', { topic: topic.text });
    }).then((chips) => {
        const container = document.getElementById('trending-container');
        if (container) container.appendChild(chips);
    });

    // Event listeners
    document.getElementById('start-chat-btn').addEventListener('click', () => {
        router.navigate('chat');
    });

    document.getElementById('explore-btn').addEventListener('click', () => {
        router.navigate('search');
    });

    document.getElementById('nav-journal').addEventListener('click', () => {
        router.navigate('journal');
    });

    document.getElementById('nav-search').addEventListener('click', () => {
        router.navigate('search');
    });
}
