/**
 * Simple hash-based SPA router.
 * Routes map to page render functions.
 */
export class Router {
    constructor() {
        this.routes = new Map();
        this.currentPage = null;
        this.app = document.getElementById('app');

        window.addEventListener('hashchange', () => this.resolve());
    }

    /**
     * Register a route
     * @param {string} path — hash path (e.g., 'chat', 'journal')
     * @param {Function} renderFn — function that returns an HTML string or element
     */
    route(path, renderFn) {
        this.routes.set(path, renderFn);
    }

    /**
     * Navigate to a route
     */
    navigate(path, data = {}) {
        this._routeData = data;
        window.location.hash = path;
    }

    /**
     * Get data passed during navigation
     */
    getRouteData() {
        return this._routeData || {};
    }

    /**
     * Resolve the current hash to a route
     */
    resolve() {
        const hash = window.location.hash.slice(1) || 'home';
        const renderFn = this.routes.get(hash);

        if (renderFn) {
            // Animate out
            this.app.style.opacity = '0';
            this.app.style.transform = 'translateY(8px)';

            setTimeout(() => {
                // Clear and render new page
                this.app.innerHTML = '';
                const result = renderFn(this.app, this.getRouteData());

                // Animate in
                requestAnimationFrame(() => {
                    this.app.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    this.app.style.opacity = '1';
                    this.app.style.transform = 'translateY(0)';
                });

                this.currentPage = hash;
            }, 150);
        }
    }

    /**
     * Start the router
     */
    start() {
        this.resolve();
    }
}
