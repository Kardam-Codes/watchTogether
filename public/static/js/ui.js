// =========================================================
// 🎨 UI Module - Handles all UI interactions and updates
// =========================================================

// ---------------------------------------------------------
// 👥 Participants UI (FIXED)
// ---------------------------------------------------------

function renderParticipants() {
  const box = $("participantsList");
  if (!box) return;

  box.innerHTML = "";

  const ids = Object.keys(window.participants || {});

  ids.forEach(id => {
    const div = document.createElement("div");
    const isMe = id === window.clientId;
    const ready = window.participants[id]?.ready === true;

    const status = ready ? "🟢 Ready" : "🟡 Waiting";

    div.className = "participant-row";
    div.innerHTML = `
      <div class="avatar">${isMe ? "You" : "U"}</div>
      <div>${status}</div>
    `;

    box.appendChild(div);
  });

  const statusText = $("statusText");
  if (statusText) {
    statusText.innerText = `${ids.length} users connected`;
  }

  // Host-only: enable play button when everyone ready
  if (window.role === "host") {
    const playBtn = $("playBtn");
    if (playBtn) {
      playBtn.disabled = !allClientsReady();
    }
  }

  updateReadyIndicator();
}

// ---------------------------------------------------------
// ✅ Ready Indicator (FIXED)
// ---------------------------------------------------------

function updateReadyIndicator() {
  const badge = $("readyIndicator");
  if (!badge) return;

  if (allClientsReady()) {
    badge.innerText = "🟢 All Ready";
    badge.style.color = "#22c55e";
  } else {
    badge.innerText = "🟡 Waiting";
    badge.style.color = "#facc15";
  }
}

// ---------------------------------------------------------
// 🌍 Export Globals
// ---------------------------------------------------------

window.renderParticipants = renderParticipants;
window.updateReadyIndicator = updateReadyIndicator;
