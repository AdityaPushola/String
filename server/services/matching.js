/**
 * MatchingService — Random queue-based matching.
 * Architecture supports future topic/preference-based matching.
 */
export class MatchingService {
    constructor() {
        /** @type {Array<{socketId: string, preferences: object, joinedAt: number}>} */
        this.queue = [];

        /** @type {Map<string, string>} socketId → partnerId */
        this.pairs = new Map();
    }

    /**
     * Add user to matching queue. Returns partner socketId if matched, null otherwise.
     * @param {string} socketId
     * @param {object} preferences — reserved for future topic-based matching
     * @returns {string|null}
     */
    addToQueue(socketId, preferences = {}) {
        // Remove if already in queue
        this.removeFromQueue(socketId);

        if (this.queue.length > 0) {
            // V1: fully random — just take the first waiting user
            const partner = this.queue.shift();
            this.pairs.set(socketId, partner.socketId);
            this.pairs.set(partner.socketId, socketId);
            return partner.socketId;
        }

        this.queue.push({ socketId, preferences, joinedAt: Date.now() });
        return null;
    }

    /**
     * Remove user from queue
     */
    removeFromQueue(socketId) {
        this.queue = this.queue.filter((u) => u.socketId !== socketId);
    }

    /**
     * Get partner for a socket
     */
    getPartner(socketId) {
        return this.pairs.get(socketId) || null;
    }

    /**
     * Remove pairing for a socket (and its partner)
     */
    removePair(socketId) {
        const partner = this.pairs.get(socketId);
        if (partner) {
            this.pairs.delete(partner);
        }
        this.pairs.delete(socketId);
    }

    /**
     * Get queue length (for metrics)
     */
    getQueueLength() {
        return this.queue.length;
    }
}
