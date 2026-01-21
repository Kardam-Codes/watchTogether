// =========================================================
// 🎬 WatchTogether - Main Client (FIXED)
// =========================================================

// ---------------------------------------------------------
// ✅ Ready State Helper (GLOBAL)
// ---------------------------------------------------------

function allClientsReady() {
  const ids = Object.keys(window.participants || {});
  if (ids.length <= 1) return true; // Only host present

  return ids.every(id => {
    if (id === window.clientId && window.role === "host") return true;
    return window.participants[id]?.ready === true;
  });
}

window.allClientsReady = allClientsReady;

// ---------------------------------------------------------
// 🧹 Clear Video (GLOBAL)
// ---------------------------------------------------------

function clearVideoUI() {
  stopHeartbeat();

  window.localMeta = {};
  window.lastSeekSent = 0;

  const player = $("player");
  if (player) player.innerHTML = "";

  const matchInfo = $("fileMatchInfo");
  if (matchInfo) matchInfo.innerText = "";

  // Safely destroy players
  if (window.ytPlayer && typeof window.ytPlayer.destroy === "function") {
    try {
      window.ytPlayer.destroy();
    } catch {}
  }

  window.ytPlayer = null;
  window.localVideo = null;
  window.mode = "local";

  updateVideoMatchUI();
}

window.clearVideoUI = clearVideoUI;

// ---------------------------------------------------------
// 🧭 Navigation + App Boot
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  wireUI();
  autoJoinFromLink();
});

// ---------------------------------------------------------
// 🎛 UI Wiring
// ---------------------------------------------------------

function wireUI() {
  // Navigation
  $("createBtn").onclick = () => {
    hide("startScreen");
    show("createForm");
  };

  $("joinBtnStart").onclick = () => {
    hide("startScreen");
    show("joinForm");
  };

  $("createCancel").onclick = () => {
    hide("createForm");
    show("startScreen");
  };

  $("joinCancel").onclick = () => {
    hide("joinForm");
    show("startScreen");
  };

  $("createConfirm").onclick = () => joinRoom(true);
  $("joinConfirm").onclick = () => joinRoom(false);

  $("clearVideoBtn").onclick = () => {
    if (window.role !== "host") return;
    clearVideoUI();
    send({ type: "clearVideo" });
  };
}

// ---------------------------------------------------------
// 🏠 Create / Join Room
// ---------------------------------------------------------

function joinRoom(isHost) {
  const name = isHost
    ? $("userNameCreate").value.trim()
    : $("userNameJoin").value.trim();

  const roomName = isHost
    ? $("roomNameCreate").value.trim()
    : $("roomNameJoin").value.trim();

  if (!name || !roomName) {
    alert("Please enter name and room.");
    return;
  }

  window.role = isHost ? "host" : "client";
  window.userName = name;
  window.room = roomName;

  connectWS(() => {
    if (isHost) send({ type: "createRoom", room: window.room });
    send({ type: "join", room: window.room, role: window.role, name });
    startApp();
  });
}

// ---------------------------------------------------------
// 🚀 App Startup
// ---------------------------------------------------------

function startApp() {
  hide("createForm");
  hide("joinForm");
  hide("startScreen");
  show("mainPanel");

  $("roomTitle").innerText = `Room: ${window.room}`;
  $("statusText").innerText = "Connected";

  // Ready button only for clients
  if (window.role === "host") {
    $("readyBtn").style.display = "none";
  } else {
    $("readyBtn").style.display = "inline-block";
  }

  // Host-only inputs
  if (window.role !== "host") {
    $("clearVideoBtn").style.display = "none";
    const ytRow = $("videoUrl")?.closest(".loader-row");
    if (ytRow) ytRow.style.display = "none";
  }

  generateInviteLink();
  renderParticipants();
  updateReadyIndicator();
}

// ---------------------------------------------------------
// 🔗 Invite Link
// ---------------------------------------------------------

function generateInviteLink() {
  const input = $("inviteLink");
  const box = $("inviteBox");

  // DOM not ready yet → retry shortly instead of crashing
  if (!input || !box) {
    console.warn("⏳ Invite DOM not ready yet — retrying...");
    setTimeout(generateInviteLink, 100);
    return;
  }

  const base = window.location.origin;
  const params = new URLSearchParams({ room: window.room });
  const link = `${base}/?${params.toString()}`;

  input.value = link;
  show("inviteBox");
}


// ---------------------------------------------------------
// 🔁 Auto Join from Invite Link (FIXED)
// ---------------------------------------------------------

function autoJoinFromLink() {
  const params = new URLSearchParams(window.location.search);
  const roomFromLink = params.get("room");

  if (!roomFromLink) return;

  const name = prompt("Enter your name to join room:");
  if (!name) return;

  window.role = "client";
  window.userName = name;
  window.room = roomFromLink;

  connectWS(() => {
    send({ type: "join", room: window.room, role: window.role, name });
    startApp();
  });
}
