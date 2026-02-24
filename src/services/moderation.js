/**
 * AI Moderation Service — NSFWJS integration.
 * Runs client-side frame analysis on video elements.
 */
export class ModerationService {
    constructor() {
        this.model = null;
        this.isRunning = false;
        this.intervalId = null;
        this.violationCount = 0;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Callbacks
        this.onViolation = null;
        this.onAutoDisconnect = null;

        // Config
        this.checkIntervalMs = 750; // check every 750ms
        this.threshold = 0.65; // NSFW probability threshold
        this.maxViolations = 3;
        this.violationCategories = ['Porn', 'Hentai', 'Sexy'];
    }

    /**
     * Load the NSFWJS model
     */
    async loadModel() {
        try {
            if (typeof nsfwjs === 'undefined') {
                console.warn('[MOD] NSFWJS not loaded — moderation disabled');
                return false;
            }
            this.model = await nsfwjs.load();
            console.log('[MOD] NSFWJS model loaded');
            return true;
        } catch (err) {
            console.error('[MOD] Failed to load model:', err);
            return false;
        }
    }

    /**
     * Start monitoring a video element
     * @param {HTMLVideoElement} videoElement
     */
    start(videoElement) {
        if (!this.model || this.isRunning) return;

        this.isRunning = true;
        this.violationCount = 0;

        this.intervalId = setInterval(async () => {
            if (videoElement.readyState >= 2 && !videoElement.paused) {
                await this._analyzeFrame(videoElement);
            }
        }, this.checkIntervalMs);

        console.log('[MOD] Monitoring started');
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[MOD] Monitoring stopped');
    }

    /**
     * Analyze a single frame
     */
    async _analyzeFrame(videoElement) {
        try {
            // Downscale for performance
            this.canvas.width = 224;
            this.canvas.height = 224;
            this.ctx.drawImage(videoElement, 0, 0, 224, 224);

            const predictions = await this.model.classify(this.canvas);

            // Check for violations
            const violation = predictions.find(
                (p) => this.violationCategories.includes(p.className) && p.probability > this.threshold
            );

            if (violation) {
                this.violationCount++;
                console.warn(`[MOD] Violation #${this.violationCount}: ${violation.className} (${(violation.probability * 100).toFixed(1)}%)`);

                if (this.onViolation) {
                    this.onViolation({
                        type: violation.className,
                        probability: violation.probability,
                        count: this.violationCount,
                    });
                }

                if (this.violationCount >= this.maxViolations) {
                    if (this.onAutoDisconnect) {
                        this.onAutoDisconnect();
                    }
                    this.stop();
                }
            }
        } catch (err) {
            // Silently fail on frame analysis errors
        }
    }

    /**
     * Reset violation counter (e.g., on new partner)
     */
    reset() {
        this.violationCount = 0;
    }
}
