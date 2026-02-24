import { readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * ExpiryService — Deletes media files older than 24 hours.
 */
export class ExpiryService {
    constructor(mediaDir) {
        this.mediaDir = mediaDir;
        this.intervalMs = 60_000; // check every minute
        this.maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
        this.timer = null;
    }

    start() {
        this.timer = setInterval(() => this.cleanup(), this.intervalMs);
        console.log('[EXPIRY] Worker started — checking every 60s');
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
    }

    cleanup() {
        try {
            const now = Date.now();
            const files = readdirSync(this.mediaDir);
            let removed = 0;

            for (const file of files) {
                const filePath = join(this.mediaDir, file);
                const stat = statSync(filePath);
                if (now - stat.mtimeMs > this.maxAgeMs) {
                    unlinkSync(filePath);
                    removed++;
                }
            }

            if (removed > 0) {
                console.log(`[EXPIRY] Removed ${removed} expired media files`);
            }
        } catch (err) {
            // Directory might not exist yet
        }
    }
}
