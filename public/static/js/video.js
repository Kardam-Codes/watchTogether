// ================================
// 🎥 Video Engine (FIXED)
// ================================

// ---------------------------------------------------------
// 📺 YouTube API Bootstrap (CRITICAL FIX)
// ---------------------------------------------------------

window.onYouTubeIframeAPIReady = function () {
  console.log("✅ YouTube API Ready");
  window.__ytReady = true;
  // ✅ Auto-load pending video if user clicked before API was ready
  if (window.__pendingYoutubeVideoId) {
    console.log("▶️ Loading pending YouTube video...");
    const vid = window.__pendingYoutubeVideoId;
    window.__pendingYoutubeVideoId = null;
    loadYoutube(vid);  
  }
};

// Track API readiness
window.__ytReady = false;
// If user tries to load video before API is ready
window.__pendingYoutubeVideoId = null;

// ---------------------------------------------------------
// 🔎 YouTube Helpers
// ---------------------------------------------------------

function extractYoutubeId(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------
// 📺 Load YouTube Player (FIXED)
// ---------------------------------------------------------

function loadYoutube(videoId) {
  if (!window.__ytReady) {
      console.warn("⏳ YouTube API not ready — queuing load...");
      window.__pendingYoutubeVideoId = videoId;
    return;
  }

  window.mode = "youtube";
  $("player").innerHTML = "";

  // Cleanup local video
  if (window.localVideo) {
    try {
      window.localVideo.pause();
    } catch {}
    window.localVideo = null;
  }

  // Destroy old player safely
  if (window.ytPlayer && typeof window.ytPlayer.destroy === "function") {
    try {
      window.ytPlayer.destroy();
    } catch {}
  }
  window.ytPlayer = null;

  window.ytPlayer = new YT.Player("player", {
    videoId,
    width: "100%",
    height: "420",
    playerVars: {
      controls: window.role === "host" ? 1 : 0
    },
    events: {
      onReady: () => {
        console.log("▶️ YT Player Ready");
      },

      onStateChange: e => {
        if (window.role !== "host") return;
      
        // ---------------- Heartbeat control ----------------
        if (e.data === YT.PlayerState.PLAYING) {
          startHeartbeat();
          send({ type: "command", action: "play" });   // ✅ Sync play
        }
      
        if (
          e.data === YT.PlayerState.PAUSED ||
          e.data === YT.PlayerState.ENDED
        ) {
          stopHeartbeat();
          send({ type: "command", action: "pause" });  // ✅ Sync pause
        }
      
        // ---------------- Manual seek detection ----------------
        if (e.data === YT.PlayerState.BUFFERING) {
          try {
            const pos = window.ytPlayer.getCurrentTime();
            sendSeek(pos);
          } catch {}
        }
      }

    }
  });
}

// ---------------------------------------------------------
// 🎬 Host loads YouTube
// ---------------------------------------------------------

$("loadVideoBtn").onclick = () => {
  if (window.role !== "host") return;

  const url = $("videoUrl").value.trim();
  const videoId = extractYoutubeId(url);

  if (!videoId) {
    alert("Invalid YouTube link");
    return;
  }

  send({
    type: "video",
    mode: "youtube",
    videoId
  });

  loadYoutube(videoId);
};

// ---------------------------------------------------------
// 🎮 Playback Control
// ---------------------------------------------------------

function playPlayback() {
  if (window.mode === "local" && window.localVideo) {
    window.localVideo.play();
  }

  if (
    window.mode === "youtube" &&
    window.ytPlayer &&
    typeof window.ytPlayer.playVideo === "function"
  ) {
    window.ytPlayer.playVideo();
  }
}

function pausePlayback() {
  if (window.mode === "local" && window.localVideo) {
    window.localVideo.pause();
  }

  if (
    window.mode === "youtube" &&
    window.ytPlayer &&
    typeof window.ytPlayer.pauseVideo === "function"
  ) {
    window.ytPlayer.pauseVideo();
  }
}
// ---------------------------------------------------------
// ✅ Ready Button Handler (RESTORED)
// ---------------------------------------------------------

(function bindReadyButton() {
  document.addEventListener("DOMContentLoaded", () => {
    const readyBtn = $("readyBtn");
    if (!readyBtn) return;

    readyBtn.onclick = () => {
      if (window.role === "host") return;

      // Local video validation
      if (window.mode === "local" && !videosMatch()) {
        alert("All users must load the same video before ready.");
        return;
      }

      window.readyState = !window.readyState;

      readyBtn.innerText = window.readyState ? "✅ Ready" : "Ready";

      send({
        type: "ready",
        ready: window.readyState
      });

      updateReadyIndicator();
    };
  });
})();

// Host Play / Pause button
$("playBtn").onclick = () => {
  if (window.role !== "host" || !allClientsReady()) {
    alert("Wait until all users are ready.");
    return;
  }

  // ---------- Local ----------
  if (window.mode === "local" && window.localVideo) {
    if (window.localVideo.paused) {
      playPlayback();
      $("playBtn").innerText = "⏸ Pause";
      send({ type: "command", action: "play" });
    } else {
      pausePlayback();
      $("playBtn").innerText = "▶ Play";
      send({ type: "command", action: "pause" });
    }
  }

  // ---------- YouTube ----------
  if (window.mode === "youtube" && window.ytPlayer) {
    if (typeof window.ytPlayer.getPlayerState !== "function") return;

    const state = window.ytPlayer.getPlayerState();

    if (state !== YT.PlayerState.PLAYING) {
      playPlayback();
      $("playBtn").innerText = "⏸ Pause";
      send({ type: "command", action: "play" });
    } else {
      pausePlayback();
      $("playBtn").innerText = "▶ Play";
      send({ type: "command", action: "pause" });
    }
  }
};

// ---------------------------------------------------------
// 🎯 Seek Sync (Throttle Protected)
// ---------------------------------------------------------

function sendSeek(position) {
  const now = Date.now();
  if (now - window.lastSeekSent < 300) return;
  window.lastSeekSent = now;

  send({
    type: "seek",
    position
  });
}

// ---------------------------------------------------------
// ❤️ Heartbeat Sync Engine (YouTube)
// ---------------------------------------------------------

function startHeartbeat() {
  if (
    window.heartbeatTimer ||
    window.role !== "host" ||
    window.mode !== "youtube" ||
    !window.ytPlayer
  ) {
    return;
  }

  window.heartbeatTimer = setInterval(() => {
    if (!window.ytPlayer || typeof window.ytPlayer.getCurrentTime !== "function") return;

    send({
      type: "heartbeat",
      position: window.ytPlayer.getCurrentTime(),
      wallTs: Date.now()
    });
  }, 500);
}

function stopHeartbeat() {
  clearInterval(window.heartbeatTimer);
  window.heartbeatTimer = null;
}

function applyHeartbeat(hb) {
  if (window.role === "host") return;
  if (window.mode !== "youtube" || !window.ytPlayer) return;
  if (typeof window.ytPlayer.getCurrentTime !== "function") return;

  const now = Date.now();
  const expected = hb.position + (now - hb.wallTs) / 1000;
  const local = window.ytPlayer.getCurrentTime();
  const diff = expected - local;

  // Hard correction
  if (Math.abs(diff) > 1.2) {
    window.ytPlayer.seekTo(expected, true);
  }
  // Soft correction
  else if (Math.abs(diff) > 0.25) {
    window.ytPlayer.setPlaybackRate(1 + diff * 0.15);
    setTimeout(() => window.ytPlayer.setPlaybackRate(1), 500);
  }
}

// ---------------------------------------------------------
// ✅ VIDEO MATCH VERIFICATION
// ---------------------------------------------------------

function videosMatch() {
  const metas = Object.values(window.localMeta);
  if (metas.length < 2) return false;

  const base = metas[0];
  return metas.every(m =>
    Math.abs(m.duration - base.duration) < 0.4 &&
    Math.abs(m.size - base.size) < 1024 * 1024
  );
}

function updateVideoMatchUI() {
  const info = $("fileMatchInfo");
  if (!info) return;

  if (window.mode !== "local") {
    info.innerText = "";
    return;
  }

  if (!videosMatch()) {
    info.innerText = "⚠️ Waiting for all users to load same video";
    info.style.color = "#facc15";
    return;
  }

  info.innerText = "✅ All users loaded the same video";
  info.style.color = "#22c55e";
}
// ---------------------------------------------------------
// 🖥️ YouTube Fullscreen Controls
// ---------------------------------------------------------

(function initYTFullscreenControls() {
  document.addEventListener("DOMContentLoaded", () => {
    const container = $("playerContainer");
    const controls = $("ytScreenControls");
    const fsBtn = $("ytFullscreenBtn");
    const exitBtn = $("ytExitFullscreenBtn");

    if (!container || !controls || !fsBtn || !exitBtn) return;

    // Show controls only when YouTube mode is active
    function updateVisibility() {
      if (window.mode === "youtube") {
        controls.classList.remove("hidden");
      } else {
        controls.classList.add("hidden");
      }
    }

    // Enter fullscreen
    fsBtn.onclick = () => {
      if (!container.requestFullscreen) return;
      container.requestFullscreen();
    };

    // Exit fullscreen
    exitBtn.onclick = () => {
      if (!document.fullscreenElement) return;
      document.exitFullscreen();
    };

    // Track fullscreen changes
    document.addEventListener("fullscreenchange", () => {
      const isFs = !!document.fullscreenElement;
      fsBtn.classList.toggle("hidden", isFs);
      exitBtn.classList.toggle("hidden", !isFs);
    });

    // Poll mode change (simple + reliable)
    setInterval(updateVisibility, 500);
  });
})();

// ---------------------------------------------------------
// 🌍 Export Globals
// ---------------------------------------------------------

window.extractYoutubeId = extractYoutubeId;
window.loadYoutube = loadYoutube;
window.playPlayback = playPlayback;
window.pausePlayback = pausePlayback;
window.videosMatch = videosMatch;
window.updateVideoMatchUI = updateVideoMatchUI;
window.startHeartbeat = startHeartbeat;
window.stopHeartbeat = stopHeartbeat;
window.applyHeartbeat = applyHeartbeat;
window.sendSeek = sendSeek;
