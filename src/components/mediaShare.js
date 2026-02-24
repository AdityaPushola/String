/**
 * Ephemeral Media Share component.
 * Image upload + voice note recording.
 */
import { showToast } from './toast.js';

export function createMediaShare(onSend) {
    const container = document.createElement('div');
    container.className = 'media-share';
    container.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    // Image upload button
    const imageBtn = document.createElement('button');
    imageBtn.className = 'btn btn-icon btn-secondary';
    imageBtn.innerHTML = '📷';
    imageBtn.title = 'Share image (expires in 24h)';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    imageBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showToast('File too large. Max 10MB.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/media', { method: 'POST', body: formData });
            if (res.ok) {
                const media = await res.json();
                showToast('Image shared! Expires in 24 hours.', 'success');
                if (onSend) onSend(media);
            }
        } catch (err) {
            showToast('Failed to share image.', 'danger');
        }

        fileInput.value = '';
    });

    // Voice note button
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'btn btn-icon btn-secondary';
    voiceBtn.innerHTML = '🎤';
    voiceBtn.title = 'Record voice note (expires in 24h)';

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    voiceBtn.addEventListener('click', async () => {
        if (isRecording) {
            // Stop recording
            mediaRecorder?.stop();
            voiceBtn.classList.remove('active');
            isRecording = false;
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach((t) => t.stop());
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });

                    const formData = new FormData();
                    formData.append('file', blob, 'voice-note.webm');

                    try {
                        const res = await fetch('/api/media', { method: 'POST', body: formData });
                        if (res.ok) {
                            const media = await res.json();
                            showToast('Voice note shared! Expires in 24 hours.', 'success');
                            if (onSend) onSend(media);
                        }
                    } catch {
                        showToast('Failed to share voice note.', 'danger');
                    }
                };

                mediaRecorder.start();
                voiceBtn.classList.add('active');
                isRecording = true;
                showToast('Recording... Click again to stop.', 'info');

                // Auto-stop after 60 seconds
                setTimeout(() => {
                    if (isRecording) {
                        mediaRecorder?.stop();
                        voiceBtn.classList.remove('active');
                        isRecording = false;
                    }
                }, 60000);
            } catch {
                showToast('Microphone access denied.', 'warning');
            }
        }
    });

    container.appendChild(imageBtn);
    container.appendChild(fileInput);
    container.appendChild(voiceBtn);

    return container;
}
