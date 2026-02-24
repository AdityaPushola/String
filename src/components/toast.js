/**
 * Toast notification component.
 */
let toastCounter = 0;

export function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const id = `toast-${++toastCounter}`;
    const icons = {
        info: '💬',
        warning: '⚠️',
        danger: '🚫',
        success: '✓',
    };

    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
    <span>${icons[type] || ''}</span>
    <span>${message}</span>
  `;

    container.appendChild(toast);

    // Auto dismiss
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
