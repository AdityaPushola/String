/**
 * Video Chat Page — Full-screen video with controls overlay.
 * Features: WebRTC video, fullscreen, camera switch, draggable PiP,
 *           real-time text chat, session state management.
 */
import { socketService } from '../services/socket.js';
import { WebRTCManager } from '../services/webrtc.js';
import { ModerationService } from '../services/moderation.js';
import { Timer } from '../components/timer.js';
import { showToast } from '../components/toast.js';
import { showReportModal } from '../components/reportModal.js';

let webrtc = null;
let moderation = null;
let timer = null;
let partnerId = null;
let chatState = 'idle'; // idle, searching, connecting, connected
let sessionMessages = []; // Shared chat log for this session
let chatPanelOpen = false;
let unreadCount = 0;
let controlsTimeout = null;
let _boundListeners = {};

export function renderChat(app, router, data = {}) {
    cleanupChat();

    webrtc = new WebRTCManager();
    moderation = new ModerationService();
    timer = new Timer();
    chatState = 'idle';
    partnerId = null;
    sessionMessages = [];
    chatPanelOpen = false;
    unreadCount = 0;

    app.innerHTML = `
    <div class="chat-page" id="chat-page">
      <!-- Status Bar -->
      <div class="chat-status-bar" id="chat-status-bar">
        <div class="status-indicator">
          <span class="status-dot searching" id="status-dot"></span>
          <span id="status-text">Initializing...</span>
        </div>
        <div id="timer-container"></div>
      </div>

      <!-- Video Container -->
      <div class="chat-video-container" id="video-container">
        <!-- Matching Overlay -->
        <div class="matching-overlay" id="matching-overlay">
          <div class="matching-icon">✦</div>
          <h2>Finding someone...</h2>
          <div class="matching-dots">
            <span></span><span></span><span></span>
          </div>
          <p>Connecting you with a random stranger</p>
          ${data.topic ? `<p style="color: var(--accent-primary); margin-top: 8px;">Topic: "${data.topic}"</p>` : ''}
        </div>

        <!-- Remote Video -->
        <div class="remote-video-wrapper" id="remote-wrapper" style="display: none;">
          <video id="remote-video" autoplay playsinline></video>
          <div class="video-blur-overlay" id="blur-overlay" style="display: none;">
            <span class="warning-icon">⚠️</span>
            <p>Content violation detected</p>
            <span style="font-size: var(--text-sm); color: var(--text-secondary);">Video blurred for safety</span>
          </div>
          <!-- Fullscreen button on remote video -->
          <button class="btn-fullscreen" id="btn-fullscreen" title="Toggle fullscreen">⛶</button>
        </div>

        <!-- Local Video (draggable PiP) -->
        <div class="local-video-wrapper" id="local-wrapper">
          <video id="local-video" autoplay playsinline muted></video>
          <button class="btn-camera-flip" id="btn-camera-flip" title="Switch camera">🔄</button>
        </div>
      </div>

      <!-- Text Chat Panel -->
      <div class="text-chat-panel" id="text-chat-panel">
        <div class="text-chat-header">
          <span>Chat</span>
          <button class="text-chat-close" id="btn-chat-close">✕</button>
        </div>
        <div class="text-chat-messages" id="chat-messages"></div>
        <div class="text-chat-input-row">
          <input type="text" id="chat-input" placeholder="Type a message..." maxlength="500" autocomplete="off" />
          <button class="btn-chat-send" id="btn-chat-send">➤</button>
        </div>
      </div>

      <!-- Controls -->
      <div class="chat-controls" id="chat-controls">
        <button class="btn btn-icon" id="btn-mute-audio" title="Mute audio">
          🎤
        </button>
        <button class="btn btn-icon" id="btn-mute-video" title="Mute video">
          📹
        </button>
        <button class="btn btn-icon btn-chat-toggle" id="btn-chat-toggle" title="Toggle chat">
          💬
          <span class="unread-badge" id="unread-badge" style="display: none;">0</span>
        </button>
        <button class="btn btn-icon btn-next" id="btn-next" title="Next person">
          Next →
        </button>
        <button class="btn btn-icon btn-end" id="btn-end" title="End chat">
          ✕
        </button>
        <button class="btn btn-icon" id="btn-report" title="Report" style="color: var(--danger);">
          🚩
        </button>
      </div>
    </div>
  `;

    // Mount timer
    const timerEl = timer.create();
    document.getElementById('timer-container').appendChild(timerEl);

    init(router, data);
    setupControls(router);
    setupFullscreen();
    setupTextChat();
    setupDraggablePiP();
}

// ─── Init ─────────────────────────────────────────────────────────────
async function init(router, data) {
    try {
        updateStatus('Requesting camera access...');
        const stream = await webrtc.getUserMedia();

        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = stream;

        socketService.connect();

        await new Promise((resolve) => {
            if (socketService.connected) {
                resolve();
            } else {
                const onConnect = () => {
                    socketService.off('connect', onConnect);
                    resolve();
                };
                socketService.on('connect', onConnect);
            }
        });

        setupSignalingListeners();
        setupMatchingListeners(router);

        moderation.loadModel().then((loaded) => {
            if (loaded) console.log('[CHAT] Moderation model ready');
        });

        updateStatus('Looking for someone...');
        chatState = 'searching';
        socketService.emit('join-queue', { topic: data.topic || null });

    } catch (err) {
        console.error('[CHAT] Init error:', err);
        showToast('Camera access is required for video chat.', 'danger');
        updateStatus('Camera access denied');
    }
}

// ─── Signaling Listeners ──────────────────────────────────────────────
function setupSignalingListeners() {
    removeAllListeners();

    _boundListeners.onOffer = async ({ from, offer }) => {
        console.log('[WEBRTC] Received offer from:', from);
        if (webrtc) await webrtc.handleOffer(from, offer);
    };
    _boundListeners.onAnswer = async ({ from, answer }) => {
        console.log('[WEBRTC] Received answer from:', from);
        if (webrtc) await webrtc.handleAnswer(answer);
    };
    _boundListeners.onIceCandidate = async ({ from, candidate }) => {
        if (webrtc) await webrtc.handleIceCandidate(candidate);
    };

    socketService.on('offer', _boundListeners.onOffer);
    socketService.on('answer', _boundListeners.onAnswer);
    socketService.on('ice-candidate', _boundListeners.onIceCandidate);
}

function removeAllListeners() {
    const eventMap = {
        onOffer: 'offer',
        onAnswer: 'answer',
        onIceCandidate: 'ice-candidate',
        onWaiting: 'waiting',
        onMatched: 'matched',
        onPartnerLeft: 'partner-left',
        onChatMessage: 'chat-message',
        onSaveResult: 'save-result',
        onSaveWaiting: 'save-waiting',
    };
    for (const [key, event] of Object.entries(eventMap)) {
        if (_boundListeners[key]) {
            socketService.off(event, _boundListeners[key]);
        }
    }
    _boundListeners = {};
}

// ─── Matching Listeners ───────────────────────────────────────────────
function setupMatchingListeners(router) {
    _boundListeners.onWaiting = () => {
        chatState = 'searching';
        updateStatus('Looking for someone...');
    };

    _boundListeners.onMatched = async ({ partnerId: pid, initiator }) => {
        console.log('[CHAT] Matched with:', pid, 'initiator:', initiator);
        partnerId = pid;
        chatState = 'connecting';
        updateStatus('Connecting...');
        webrtc.partnerId = pid;

        // Reset session state for new match
        sessionMessages = [];
        clearChatMessages();
        unreadCount = 0;
        updateUnreadBadge();

        if (initiator) {
            console.log('[CHAT] Creating offer...');
            await webrtc.createOffer();
        }
    };

    _boundListeners.onPartnerLeft = () => {
        showToast('Your partner left the chat.', 'info');
        handleChatEnd(router, false);
    };

    // Text chat incoming message
    _boundListeners.onChatMessage = ({ id, from, text, timestamp }) => {
        const msg = { id, from, text, timestamp, self: false };
        sessionMessages.push(msg);
        appendChatMessage(msg);

        if (!chatPanelOpen) {
            unreadCount++;
            updateUnreadBadge();
        }
    };

    socketService.on('waiting', _boundListeners.onWaiting);
    socketService.on('matched', _boundListeners.onMatched);
    socketService.on('partner-left', _boundListeners.onPartnerLeft);
    socketService.on('chat-message', _boundListeners.onChatMessage);

    // WebRTC callbacks
    webrtc.onRemoteStream = (stream) => {
        chatState = 'connected';
        console.log('[CHAT] Remote stream received');
        const remoteVideo = document.getElementById('remote-video');
        const remoteWrapper = document.getElementById('remote-wrapper');
        const matchingOverlay = document.getElementById('matching-overlay');

        if (remoteVideo) remoteVideo.srcObject = stream;
        if (remoteWrapper) remoteWrapper.style.display = '';
        if (matchingOverlay) matchingOverlay.style.display = 'none';

        updateStatus('Connected');
        timer.start();

        if (remoteVideo) moderation.start(remoteVideo);
        showToast('Connected with a stranger!', 'success');
    };

    webrtc.onConnectionState = (state) => {
        console.log('[CHAT] Connection state:', state);
        if (state === 'connected') updateStatus('Connected');
    };

    moderation.onViolation = ({ type, count }) => {
        const blurOverlay = document.getElementById('blur-overlay');
        if (blurOverlay) blurOverlay.style.display = 'flex';
        showToast(`⚠️ Content violation detected (${count}/3)`, 'warning');
        setTimeout(() => { if (blurOverlay) blurOverlay.style.display = 'none'; }, 3000);
    };

    moderation.onAutoDisconnect = () => {
        showToast('Chat ended due to repeated violations.', 'danger');
        socketService.emit('moderation-violation', { partnerId, type: 'auto-disconnect' });
        handleChatEnd(router, true);
    };
}

// ─── Chat End / Next ──────────────────────────────────────────────────
function handleChatEnd(router, wasViolation) {
    const duration = timer.getDuration();
    timer.stop();
    moderation.stop();
    moderation.reset();
    webrtc.cleanup();

    chatState = 'idle';

    if (!wasViolation && duration > 5) {
        router.navigate('postchat', {
            duration,
            partnerId,
            messages: [...sessionMessages],
        });
    } else if (wasViolation) {
        router.navigate('home');
    } else {
        findNextPartner();
    }
}

function findNextPartner() {
    const remoteWrapper = document.getElementById('remote-wrapper');
    const matchingOverlay = document.getElementById('matching-overlay');
    const blurOverlay = document.getElementById('blur-overlay');

    if (remoteWrapper) remoteWrapper.style.display = 'none';
    if (matchingOverlay) matchingOverlay.style.display = '';
    if (blurOverlay) blurOverlay.style.display = 'none';

    timer.reset();
    moderation.stop();
    moderation.reset();
    webrtc.cleanup();

    // Reset session state
    sessionMessages = [];
    clearChatMessages();
    closeChatPanel();
    unreadCount = 0;
    updateUnreadBadge();

    chatState = 'searching';
    partnerId = null;
    updateStatus('Looking for someone...');
    socketService.emit('join-queue', {});
}

// ─── Controls ─────────────────────────────────────────────────────────
function setupControls(router) {
    document.getElementById('btn-mute-audio')?.addEventListener('click', () => {
        const enabled = webrtc.toggleAudio();
        const btn = document.getElementById('btn-mute-audio');
        if (btn) {
            btn.innerHTML = enabled ? '🎤' : '🔇';
            btn.classList.toggle('active', !enabled);
        }
    });

    document.getElementById('btn-mute-video')?.addEventListener('click', () => {
        const enabled = webrtc.toggleVideo();
        const btn = document.getElementById('btn-mute-video');
        if (btn) {
            btn.innerHTML = enabled ? '📹' : '📵';
            btn.classList.toggle('active', !enabled);
        }
    });

    // Camera flip
    document.getElementById('btn-camera-flip')?.addEventListener('click', async () => {
        try {
            await webrtc.switchCamera();
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = webrtc.localStream;
                // Remove mirror for back camera
                localVideo.style.transform = webrtc.currentFacingMode === 'user' ? 'scaleX(-1)' : 'none';
            }
            showToast(webrtc.currentFacingMode === 'user' ? 'Front camera' : 'Back camera', 'info');
        } catch (err) {
            showToast('Camera switch not available', 'warning');
        }
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
        if (partnerId) {
            socketService.emit('next', { partnerId });
        }
        if (chatState === 'connected' && timer.getDuration() > 5) {
            const duration = timer.getDuration();
            timer.stop();
            moderation.stop();
            webrtc.cleanup();
            const pid = partnerId;
            partnerId = null;
            router.navigate('postchat', {
                duration,
                partnerId: pid,
                messages: [...sessionMessages],
            });
        } else {
            partnerId = null;
            findNextPartner();
        }
    });

    document.getElementById('btn-end')?.addEventListener('click', () => {
        if (partnerId) {
            socketService.emit('end-chat', { partnerId });
        }
        const duration = timer.getDuration();
        timer.stop();
        moderation.stop();
        const pid = partnerId;
        webrtc.destroy();

        if (duration > 5) {
            router.navigate('postchat', {
                duration,
                partnerId: pid,
                messages: [...sessionMessages],
            });
        } else {
            router.navigate('home');
        }
    });

    document.getElementById('btn-report')?.addEventListener('click', () => {
        showReportModal(partnerId, timer.getDuration(), () => { });
    });
}

// ─── Full-Screen ──────────────────────────────────────────────────────
function setupFullscreen() {
    const btnFs = document.getElementById('btn-fullscreen');
    const chatPage = document.getElementById('chat-page');

    if (!btnFs) return;

    btnFs.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen(chatPage);
    });

    // Double-tap on remote video for mobile
    let lastTap = 0;
    const remoteWrapper = document.getElementById('remote-wrapper');
    if (remoteWrapper) {
        remoteWrapper.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTap < 300) {
                e.preventDefault();
                toggleFullscreen(chatPage);
            }
            lastTap = now;
        });

        remoteWrapper.addEventListener('click', () => {
            if (document.fullscreenElement) {
                showControlsTemporarily();
            }
        });
    }

    document.addEventListener('fullscreenchange', () => {
        const isFs = !!document.fullscreenElement;
        chatPage?.classList.toggle('is-fullscreen', isFs);

        if (isFs) {
            showControlsTemporarily();
        } else {
            clearTimeout(controlsTimeout);
            chatPage?.classList.remove('controls-hidden');
        }
    });
}

function toggleFullscreen(element) {
    if (!element) return;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
    } else {
        element.requestFullscreen().catch((err) => {
            console.warn('[FS] Fullscreen failed:', err);
            showToast('Fullscreen not supported', 'info');
        });
    }
}

function showControlsTemporarily() {
    const chatPage = document.getElementById('chat-page');
    if (!chatPage) return;
    chatPage.classList.remove('controls-hidden');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
        if (document.fullscreenElement) {
            chatPage.classList.add('controls-hidden');
        }
    }, 3000);
}

// ─── Draggable PiP (Local Video) ──────────────────────────────────────
function setupDraggablePiP() {
    const pip = document.getElementById('local-wrapper');
    if (!pip) return;

    let isDragging = false;
    let startX, startY, pipX, pipY;
    let hasMoved = false;
    let dragStartClientX, dragStartClientY;
    const DRAG_THRESHOLD = 10; // px — movement under this counts as a tap

    // Get initial position from CSS
    const rect = pip.getBoundingClientRect();
    const parent = pip.parentElement.getBoundingClientRect();
    pipX = rect.left - parent.left;
    pipY = rect.top - parent.top;

    function onStart(clientX, clientY) {
        isDragging = true;
        hasMoved = false;
        dragStartClientX = clientX;
        dragStartClientY = clientY;
        startX = clientX - pipX;
        startY = clientY - pipY;
        pip.style.cursor = 'grabbing';
        pip.style.transition = 'none';
    }

    function onMove(clientX, clientY) {
        if (!isDragging) return;

        // Only count as drag if moved beyond threshold
        const dx = clientX - dragStartClientX;
        const dy = clientY - dragStartClientY;
        if (!hasMoved && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        hasMoved = true;

        const parent = pip.parentElement.getBoundingClientRect();
        const pipRect = pip.getBoundingClientRect();

        let newX = clientX - startX;
        let newY = clientY - startY;

        // Constrain to parent bounds
        const maxX = parent.width - pipRect.width;
        const maxY = parent.height - pipRect.height;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        pipX = newX;
        pipY = newY;

        pip.style.left = newX + 'px';
        pip.style.top = newY + 'px';
        pip.style.right = 'auto';
        pip.style.bottom = 'auto';
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        pip.style.cursor = 'grab';
        pip.style.transition = '';

        if (!hasMoved) {
            // Tap without drag — toggle expanded size
            pip.classList.toggle('pip-expanded');
            return;
        }

        // Snap to nearest corner
        const parent = pip.parentElement.getBoundingClientRect();
        const pipRect = pip.getBoundingClientRect();
        const centerX = pipX + pipRect.width / 2;
        const centerY = pipY + pipRect.height / 2;
        const midX = parent.width / 2;
        const midY = parent.height / 2;
        const margin = 12;

        const snapX = centerX < midX ? margin : parent.width - pipRect.width - margin;
        const snapY = centerY < midY ? margin : parent.height - pipRect.height - margin;

        pipX = snapX;
        pipY = snapY;

        pip.style.transition = 'left 0.3s ease, top 0.3s ease';
        pip.style.left = snapX + 'px';
        pip.style.top = snapY + 'px';
        pip.style.right = 'auto';
        pip.style.bottom = 'auto';
    }

    // Mouse events
    pip.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onStart(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', onEnd);

    // Touch events
    pip.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        onStart(touch.clientX, touch.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            const touch = e.touches[0];
            onMove(touch.clientX, touch.clientY);
        }
    }, { passive: true });
    document.addEventListener('touchend', onEnd);
}

// ─── Text Chat ────────────────────────────────────────────────────────
function setupTextChat() {
    const toggleBtn = document.getElementById('btn-chat-toggle');
    const closeBtn = document.getElementById('btn-chat-close');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-chat-send');

    toggleBtn?.addEventListener('click', () => {
        if (chatPanelOpen) closeChatPanel();
        else openChatPanel();
    });

    closeBtn?.addEventListener('click', closeChatPanel);
    sendBtn?.addEventListener('click', sendMessage);

    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function openChatPanel() {
    const panel = document.getElementById('text-chat-panel');
    if (panel) panel.classList.add('open');
    chatPanelOpen = true;
    unreadCount = 0;
    updateUnreadBadge();
    setTimeout(() => document.getElementById('chat-input')?.focus(), 300);
    scrollChatToBottom();
}

function closeChatPanel() {
    const panel = document.getElementById('text-chat-panel');
    if (panel) panel.classList.remove('open');
    chatPanelOpen = false;
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text || !partnerId || chatState !== 'connected') {
        if (!partnerId || chatState !== 'connected') {
            showToast('Connect with someone first', 'info');
        }
        return;
    }

    const msg = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        from: socketService.id,
        text,
        timestamp: Date.now(),
        self: true,
    };

    sessionMessages.push(msg);
    appendChatMessage(msg);
    socketService.emit('chat-message', { to: partnerId, text });
    input.value = '';
    input.focus();
}

function appendChatMessage(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${msg.self ? 'chat-msg-self' : 'chat-msg-other'}`;

    const time = new Date(msg.timestamp);
    const timeStr = time.getHours().toString().padStart(2, '0') + ':' +
        time.getMinutes().toString().padStart(2, '0');

    div.innerHTML = `
    <div class="chat-msg-bubble">
      <span class="chat-msg-text">${escapeHtml(msg.text)}</span>
      <span class="chat-msg-time">${timeStr}</span>
    </div>
  `;

    container.appendChild(div);
    scrollChatToBottom();
}

function clearChatMessages() {
    const container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '';
}

function scrollChatToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
        requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    }
}

function updateUnreadBadge() {
    const badge = document.getElementById('unread-badge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? '' : 'none';
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Status + Cleanup ─────────────────────────────────────────────────
function updateStatus(text) {
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    if (statusText) statusText.textContent = text;
    if (statusDot) {
        statusDot.className = text === 'Connected' ? 'status-dot' : 'status-dot searching';
    }
}

export function cleanupChat() {
    removeAllListeners();
    clearTimeout(controlsTimeout);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    if (moderation) { moderation.stop(); moderation = null; }
    if (timer) { timer.stop(); timer = null; }
    if (webrtc) { webrtc.destroy(); webrtc = null; }
    sessionMessages = [];
    chatPanelOpen = false;
    unreadCount = 0;
}
