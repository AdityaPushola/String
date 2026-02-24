/**
 * Session timer component.
 */
export class Timer {
    constructor() {
        this.seconds = 0;
        this.intervalId = null;
        this.element = null;
        this.onTick = null;
    }

    create() {
        this.element = document.createElement('div');
        this.element.className = 'chat-timer';
        this.element.textContent = '00:00';
        return this.element;
    }

    start() {
        this.seconds = 0;
        this._update();
        this.intervalId = setInterval(() => {
            this.seconds++;
            this._update();
            if (this.onTick) this.onTick(this.seconds);
        }, 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    reset() {
        this.stop();
        this.seconds = 0;
        this._update();
    }

    getFormatted() {
        const mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
        const secs = (this.seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    getDuration() {
        return this.seconds;
    }

    _update() {
        if (this.element) {
            this.element.textContent = this.getFormatted();
        }
    }
}
