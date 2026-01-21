// =========================================================
// 🔌 WebSocket Engine (FIXED)
// =========================================================

function connectWS(onOpen) {
  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  window.ws = new WebSocket(`${protocol}://${window.location.host}/ws`);

  window.ws.onopen = () => {
    console.log("✅ WebSocket connected");
    onOpen && onOpen();
  };

  window.ws.onerror = err => {
    console.error("❌ WebSocket error:", err);
    alert("WebSocket connection failed.");
  };

  window.ws.onclose = () => {
    console.warn("⚠️ WebSocket closed");
  };

  window.ws.onmessage = e => {
    try {
      const msg = JSON.parse(e.data);
      handleMessage(msg);
    } catch (err) {
      console.error("❌ Invalid WS message:", e.data);
    }
  };
}

// ---------------------------------------------------------

function send(data) {
  if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;

  data.room = window.room;
  window.ws.send(JSON.stringify(data));
}

// =========================================================
// 📩 Message Handling (FIXED)
// =========================================================

function handleMessage(msg) {
  console.log("WS:", msg);

  // ---------------- Connected ----------------
  if (msg.type === "connected") {
    window.clientId = msg.clientId;
    return;
  }
  // ---------------- Room State Sync (NEW USER JOIN) ----------------
  if (msg.type === "roomState") {
    const state = msg.state;
    if (!state) return;

    console.log("📦 Applying room state:", state);

    // Load video if exists
    if (state.video?.mode === "youtube" && state.video.videoId) {
      loadYoutube(state.video.videoId);

      // Wait until player is ready before syncing
      const waitForPlayer = setInterval(() => {
        if (window.ytPlayer && typeof window.ytPlayer.seekTo === "function") {
          clearInterval(waitForPlayer);

          try {
            window.ytPlayer.seekTo(state.position || 0, true);

            if (state.playing) {
              playPlayback();
            } else {
              pausePlayback();
            }
          } catch (err) {
            console.warn("Failed to sync player:", err);
          }
        }
      }, 200);
    }

    return;
  }

  // ---------------- Participants (MERGE FIX) ----------------
  if (msg.type === "participants") {
    const incoming = msg.list || [];

    // Preserve existing states
    const next = {};

    incoming.forEach(id => {
      if (window.participants[id]) {
        // Keep previous ready state
        next[id] = window.participants[id];
      } else {
        // New participant
        next[id] = { ready: false };
      }
    });

    window.participants = next;
    renderParticipants();
    return;
  }

  // ---------------- Ready State ----------------
if (msg.type === "ready") {
  if (!window.participants[msg.from]) {
    window.participants[msg.from] = { ready: false };
  }

  window.participants[msg.from].ready = !!msg.ready;
  renderParticipants();

  // ✅ GLOBAL PAUSE when anyone becomes unready
  if (!allClientsReady()) {
    pausePlayback();

    // Host also informs everyone explicitly
    if (window.role === "host") {
      send({ type: "command", action: "pause" });
    }
  }

  return;
}


  // ---------------- Seek Sync ----------------
  if (msg.type === "seek") {
    if (window.role === "host") return;

    if (window.mode === "local" && window.localVideo) {
      window.localVideo.currentTime = msg.position;
    }

    if (
      window.mode === "youtube" &&
      window.ytPlayer &&
      typeof window.ytPlayer.seekTo === "function"
    ) {
      window.ytPlayer.seekTo(msg.position, true);
    }
    return;
  }

  // ---------------- Chat ----------------
  if (msg.type === "chat") {
    addChat(msg.fromName, msg.text);
    return;
  }

  // ---------------- Heartbeat ----------------
  if (msg.type === "heartbeat") {
    applyHeartbeat(msg);
    return;
  }

  // ---------------- Local Video Metadata ----------------
  if (msg.type === "localMeta") {
    window.localMeta[msg.from] = {
      duration: msg.duration,
      size: msg.size
    };
    updateVideoMatchUI();
    return;
  }

  // ---------------- YouTube Load ----------------
  if (msg.type === "video" && msg.mode === "youtube") {
    loadYoutube(msg.videoId);
    return;
  }

  // ---------------- Playback Commands ----------------
  if (msg.type === "command") {
    if (msg.action === "play") {
      playPlayback();
      $("playBtn").innerText = "⏸ Pause";
    }

    if (msg.action === "pause") {
      pausePlayback();
      $("playBtn").innerText = "▶ Play";
    }
    return;
  }

  // ---------------- Clear Video ----------------
  if (msg.type === "clearVideo") {
    clearVideoUI();
    return;
  }
}

// ---------------------------------------------------------
// 🌍 Export Globals
// ---------------------------------------------------------

window.connectWS = connectWS;
window.send = send;
window.handleMessage = handleMessage;
