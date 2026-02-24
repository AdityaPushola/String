/**
 * Socket.io client wrapper — singleton.
 * Handles connection, reconnection, and event management.
 * Supports registering listeners before connect() — they get queued and applied on connect.
 */
class SocketService {
    constructor() {
        this.socket = null;
        /** @type {Array<{event: string, callback: Function}>} */
        this._pendingListeners = [];
    }

    connect() {
        if (this.socket?.connected) return;

        // If socket already exists but disconnected, clean up first
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
        }

        this.socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('[SOCKET] Connected:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[SOCKET] Disconnected:', reason);
        });

        this.socket.on('connect_error', (err) => {
            console.error('[SOCKET] Connection error:', err.message);
        });

        // Apply any listeners that were registered before connect()
        for (const { event, callback } of this._pendingListeners) {
            this.socket.on(event, callback);
        }
        this._pendingListeners = [];
    }

    get id() {
        return this.socket?.id || null;
    }

    get connected() {
        return this.socket?.connected || false;
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    /**
     * Register event listener. If socket isn't connected yet, queues it
     * to be applied when connect() is called.
     */
    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        } else {
            this._pendingListeners.push({ event, callback });
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
        // Also remove from pending
        this._pendingListeners = this._pendingListeners.filter(
            (l) => !(l.event === event && l.callback === callback)
        );
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Singleton
export const socketService = new SocketService();
