/**
 * Report Modal component.
 */
import { submitReport } from '../services/storage.js';
import { showToast } from './toast.js';

const REPORT_REASONS = [
    { id: 'nudity', label: 'Nudity or Sexual Content', icon: '🚫' },
    { id: 'harassment', label: 'Harassment or Abuse', icon: '⚠️' },
    { id: 'hate', label: 'Hate Speech', icon: '🛑' },
    { id: 'underage', label: 'Underage User', icon: '🔞' },
    { id: 'spam', label: 'Spam or Scam', icon: '📩' },
    { id: 'other', label: 'Other', icon: '📋' },
];

export function showReportModal(partnerId, chatDuration, onClose) {
    const container = document.getElementById('modal-container');
    let selectedReason = null;

    container.innerHTML = `
    <div class="overlay" id="report-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Report User</h3>
          <button class="modal-close" id="report-close">✕</button>
        </div>
        <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-lg);">
          Your report is anonymous. We take safety seriously.
        </p>
        <div class="form-group" style="margin-bottom: var(--space-lg);">
          <label class="form-label">Reason</label>
          <div id="report-reasons" style="display: flex; flex-direction: column; gap: var(--space-sm);">
            ${REPORT_REASONS.map((r) => `
              <button class="chip" data-reason="${r.id}" style="justify-content: flex-start; padding: var(--space-md); border-radius: var(--radius-md);">
                <span>${r.icon}</span>
                <span>${r.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="form-group" style="margin-bottom: var(--space-lg);">
          <label class="form-label">Additional details (optional)</label>
          <textarea id="report-description" class="form-textarea" placeholder="Describe what happened..." maxlength="500"></textarea>
          <span class="form-hint">Max 500 characters</span>
        </div>
        <div style="display: flex; gap: var(--space-md);">
          <button class="btn btn-secondary" id="report-cancel" style="flex: 1;">Cancel</button>
          <button class="btn btn-danger" id="report-submit" style="flex: 1;" disabled>Submit Report</button>
        </div>
      </div>
    </div>
  `;

    // Reason selection
    container.querySelectorAll('[data-reason]').forEach((btn) => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('[data-reason]').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            selectedReason = btn.dataset.reason;
            container.querySelector('#report-submit').disabled = false;
        });
    });

    // Close
    const close = () => {
        container.innerHTML = '';
        if (onClose) onClose();
    };

    container.querySelector('#report-close').addEventListener('click', close);
    container.querySelector('#report-cancel').addEventListener('click', close);
    container.querySelector('#report-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'report-overlay') close();
    });

    // Submit
    container.querySelector('#report-submit').addEventListener('click', async () => {
        if (!selectedReason) return;

        const description = container.querySelector('#report-description').value;
        const success = await submitReport({
            reason: selectedReason,
            description,
            reportedPartner: partnerId,
            chatDuration,
        });

        if (success) {
            showToast('Report submitted. Thank you for keeping STRING safe.', 'success');
        } else {
            showToast('Failed to submit report. Please try again.', 'danger');
        }
        close();
    });
}
