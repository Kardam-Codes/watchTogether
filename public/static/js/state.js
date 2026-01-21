// ================================
// 🌍 Global App State (FIXED)
// ================================
//
// IMPORTANT:
// All shared state must live on window so every script
// sees the same instance (no scope bugs).
//

window.ws = null;
window.clientId = null;
window.room = null;
window.role = null;
window.userName = null;

window.participants = {};     // clientId -> { ready: boolean }
window.readyState = false;

window.mode = "local";        // "local" | "youtube"
window.ytPlayer = null;
window.localVideo = null;

window.heartbeatTimer = null;

// ---------------- Local Video Verification ----------------
window.localMeta = {};        // clientId -> { duration, size }
window.lastSeekSent = 0;

// ---------------- Debug Helper (optional but useful) ----------------
window.dumpState = function () {
  console.table({
    clientId: window.clientId,
    room: window.room,
    role: window.role,
    userName: window.userName,
    mode: window.mode,
    participants: Object.keys(window.participants).length,
    readyState: window.readyState,
    ytPlayer: !!window.ytPlayer,
    localVideo: !!window.localVideo
  });
};
