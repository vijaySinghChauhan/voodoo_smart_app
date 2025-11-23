// Minimal web shim for react-native-webrtc to allow bundling on Web.
// This does NOT implement actual WebRTC; it just prevents import-time errors.

export class RTCPeerConnection {
  connectionState: string = 'new';
  iceConnectionState: string = 'new';
  onicecandidate: ((event: any) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: any) => void) | null = null;
  onaddstream: ((event: any) => void) | null = null;
  addTransceiver(..._args: any[]) {}
  addTrack(..._args: any[]) {}
  addStream(..._args: any[]) {}
  async setRemoteDescription(_desc: any) {}
  async setLocalDescription(_desc: any) {}
  async createOffer(_opts?: any) { return { sdp: '', type: 'offer' } as any; }
  async createAnswer() { return { sdp: '', type: 'answer' } as any; }
  async addIceCandidate(_candidate: any) {}
  close() {}
}

export class RTCIceCandidate {
  constructor(_init: any) {}
}

export class RTCSessionDescription {
  constructor(_init: any) {}
}

export class MediaStream {
  private audioTracks: any[] = [];
  constructor(tracks?: any[]) { this.audioTracks = tracks || []; }
  getAudioTracks() { return this.audioTracks; }
}

export const mediaDevices = {
  async getUserMedia(_constraints: any) {
    // Return a mock stream with no tracks
    return new MediaStream([]);
  },
};

