/**
 * Landing Page — Premium, brand-aligned hero with STRING identity.
 */
import { createTrendingChips } from '../components/searchBar.js';

export function renderLanding(app, router) {
  app.innerHTML = `
    <div class="landing">
      <div class="landing-bg">
        <div class="string-thread thread-1"></div>
        <div class="string-thread thread-2"></div>
        <div class="string-thread thread-3"></div>
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>

      <!-- Navigation -->
      <nav class="landing-nav">
        <div class="landing-logo">
          <span class="logo-icon">⦿</span>
          <span class="logo-text">STRING</span>
        </div>
        <div class="landing-nav-links">
          <button class="nav-link" id="nav-journal">Journal</button>
          <button class="nav-link" id="nav-search">Explore</button>
        </div>
      </nav>

      <!-- Hero -->
      <section class="landing-hero">
        <div class="landing-hero-tag">
          <span class="pulse-dot"></span>
          <span>Live & Anonymous</span>
        </div>

        <h1 class="hero-title">
          Where strangers<br/>
          become <span class="gradient-text">stories</span>
        </h1>

        <p class="hero-subtitle">
          Anonymous video conversations with real humans.
          No profiles. No history. Just genuine connection.
        </p>

        <div class="landing-cta-group">
          <button class="btn-start" id="start-chat-btn">
            <span class="btn-start-glow"></span>
            <span class="btn-start-text">Start a Conversation</span>
            <span class="btn-start-arrow">→</span>
          </button>
        </div>

        <div class="hero-stats">
          <div class="stat">
            <span class="stat-number" id="online-count">—</span>
            <span class="stat-label">Online Now</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-number">100%</span>
            <span class="stat-label">Anonymous</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-number">24/7</span>
            <span class="stat-label">Available</span>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="landing-features">
        <div class="feature-card">
          <div class="feature-glow feature-glow-purple"></div>
          <div class="feature-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h3>AI Safety Shield</h3>
          <p>Real-time content moderation keeps every conversation safe and respectful.</p>
        </div>
        <div class="feature-card">
          <div class="feature-glow feature-glow-teal"></div>
          <div class="feature-icon-wrap feature-icon-teal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>Meaningful Moments</h3>
          <p>Save conversations, write notes, and keep the wisdom strangers share with you.</p>
        </div>
        <div class="feature-card">
          <div class="feature-glow feature-glow-amber"></div>
          <div class="feature-icon-wrap feature-icon-amber">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3>Ephemeral & Private</h3>
          <p>Nothing stored without consent. Your privacy is sacred — conversations vanish by default.</p>
        </div>
      </section>

      <!-- How it works -->
      <section class="landing-how">
        <h2 class="section-title">How STRING works</h2>
        <div class="how-steps">
          <div class="how-step">
            <div class="step-number">01</div>
            <p>Hit start — you're instantly matched with a stranger</p>
          </div>
          <div class="how-connector"></div>
          <div class="how-step">
            <div class="step-number">02</div>
            <p>Talk, listen, share — real video, real conversation</p>
          </div>
          <div class="how-connector"></div>
          <div class="how-step">
            <div class="step-number">03</div>
            <p>Save the moment or let it go — you're in control</p>
          </div>
        </div>
      </section>

      <!-- Trending Topics -->
      <section class="landing-trending">
        <h2 class="section-title">Conversation Starters</h2>
        <p class="section-desc">Pick a topic or just jump in — every chat is a new story</p>
        <div id="trending-container"></div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="footer-brand">
          <span class="logo-icon">⦿</span> STRING
        </div>
        <p>Connecting strangers. Creating stories.</p>
      </footer>
    </div>
  `;

  // Load trending topics
  createTrendingChips((topic) => {
    router.navigate('chat', { topic: topic.text });
  }).then((chips) => {
    const container = document.getElementById('trending-container');
    if (container) container.appendChild(chips);
  });

  // Simulate online count
  const countEl = document.getElementById('online-count');
  if (countEl) {
    const base = Math.floor(Math.random() * 80) + 120;
    countEl.textContent = base.toLocaleString();
    setInterval(() => {
      const delta = Math.floor(Math.random() * 11) - 5;
      const current = parseInt(countEl.textContent.replace(/,/g, '')) + delta;
      countEl.textContent = Math.max(50, current).toLocaleString();
    }, 5000);
  }

  // Event listeners
  document.getElementById('start-chat-btn').addEventListener('click', () => {
    router.navigate('chat');
  });

  document.getElementById('nav-journal').addEventListener('click', () => {
    router.navigate('journal');
  });

  document.getElementById('nav-search').addEventListener('click', () => {
    router.navigate('search');
  });
}
