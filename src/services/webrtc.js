/**
 * WebRTC Connection Manager.
 * Handles peer connections, media streams, ICE candidates, and SDP exchange.
 */
import { socketService } from './socket.js';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRTCManager {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.partnerId = null;
        this.currentFacingMode = 'user'; // 'user' = front, 'environment' = back

        // Callbacks
        this.onRemoteStream = null;
        this.onConnectionState = null;
        this.onDisconnect = null;
        this.onLocalStream = null;
    }

    /**
     * Get user media (camera + mic)
     */
    async getUserMedia(constraints = {}) {
        try {
            const defaultConstraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: this.currentFacingMode,
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                ...constraints,
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
            if (this.onLocalStream) this.onLocalStream(this.localStream);
            return this.localStream;
        } catch (err) {
            console.error('[WEBRTC] Failed to get user media:', err);
            throw err;
        }
    }

    /**
     * Switch between front and back camera.
     * Replaces the video track in the peer connection without renegotiation.
     * Returns the new stream so the caller can update the video element.
     */
    async switchCamera() {
        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

        try {
            // Stop current video track
            const oldVideoTrack = this.localStream?.getVideoTracks()[0];
            if (oldVideoTrack) oldVideoTrack.stop();

            // Get new stream with switched camera
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: { exact: this.currentFacingMode },
                },
                audio: false, // Keep existing audio track
            });

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Replace in local stream
            if (this.localStream && oldVideoTrack) {
                this.localStream.removeTrack(oldVideoTrack);
            }
            if (this.localStream) {
                this.localStream.addTrack(newVideoTrack);
            }

            // Replace in peer connection (live swap, no renegotiation)
            if (this.peerConnection) {
                const sender = this.peerConnection.getSenders().find(
                    s => s.track?.kind === 'video' || (s.track === null && oldVideoTrack)
                );
                if (sender) {
                    await sender.replaceTrack(newVideoTrack);
                }
            }

            console.log('[WEBRTC] Switched camera to:', this.currentFacingMode);
            return this.localStream;

        } catch (err) {
            // Back camera might not exist — revert
            console.warn('[WEBRTC] Camera switch failed:', err.message);
            this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
            throw err;
        }
    }

    /**
     * Create a new peer connection
     */
    _createPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        this.remoteStream = new MediaStream();

        // Add local tracks to connection
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle incoming tracks
        this.peerConnection.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                this.remoteStream.addTrack(track);
            });
            if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.partnerId) {
                socketService.emit('ice-candidate', {
                    to: this.partnerId,
                    candidate: event.candidate,
                });
            }
        };

        // Monitor connection state
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('[WEBRTC] Connection state:', state);
            if (this.onConnectionState) this.onConnectionState(state);

            if (state === 'disconnected' || state === 'failed') {
                if (this.onDisconnect) this.onDisconnect();
            }
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('[WEBRTC] ICE state:', this.peerConnection.iceConnectionState);
        };
    }

    /**
     * Create and send offer (initiator)
     */
    async createOffer() {
        this._createPeerConnection();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        socketService.emit('offer', {
            to: this.partnerId,
            offer: this.peerConnection.localDescription,
        });
    }

    /**
     * Handle incoming offer and send answer
     */
    async handleOffer(from, offer) {
        this.partnerId = from;
        this._createPeerConnection();

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        socketService.emit('answer', {
            to: from,
            answer: this.peerConnection.localDescription,
        });
    }

    /**
     * Handle incoming answer
     */
    async handleAnswer(answer) {
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    /**
     * Handle incoming ICE candidate
     */
    async handleIceCandidate(candidate) {
        if (this.peerConnection) {
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.warn('[WEBRTC] Failed to add ICE candidate:', err);
            }
        }
    }

    /**
     * Toggle audio track
     */
    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return false;
    }

    /**
     * Toggle video track
     */
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled;
            }
        }
        return false;
    }

    /**
     * Clean up connection (for "Next" or end)
     */
    cleanup() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.remoteStream = null;
        this.partnerId = null;
    }

    /**
     * Fully destroy (stop all tracks)
     */
    destroy() {
        this.cleanup();
        if (this.localStream) {
            this.localStream.getTracks().forEach((t) => t.stop());
            this.localStream = null;
        }
    }

}
