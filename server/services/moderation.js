/**
 * Server-side moderation hooks.
 * V1: Moderation runs client-side via NSFWJS.
 * This service provides hooks for server-side logging and future cloud inference.
 */
export class ModerationService {
    constructor() {
        this.violations = new Map(); // socketId → violation count
    }

    recordViolation(socketId, type) {
        const count = (this.violations.get(socketId) || 0) + 1;
        this.violations.set(socketId, count);
        console.log(`[MOD] Violation #${count} for ${socketId}: ${type}`);
        return count;
    }

    shouldAutoDisconnect(socketId) {
        return (this.violations.get(socketId) || 0) >= 3;
    }

    clearViolations(socketId) {
        this.violations.delete(socketId);
    }
}
