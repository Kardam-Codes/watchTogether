// ================================
// 💬 Chat Engine (FIXED)
// ================================

(function initChat() {
  document.addEventListener("DOMContentLoaded", () => {
    const sendBtn = $("chatSend");
    const input = $("chatInput");
    const box = $("chatMessages");

    if (!sendBtn || !input || !box) {
      console.warn("⚠️ Chat UI not ready");
      return;
    }

    // Prevent double-binding
    sendBtn.onclick = null;

    sendBtn.onclick = () => {
      const text = input.value.trim();
      if (!text) return;

      send({
        type: "chat",
        text,
        fromName: window.userName || "Guest"
      });

      input.value = "";
    };
  });
})();

// ---------------------------------------------------------
// ➕ Add Chat Message (GLOBAL)
// ---------------------------------------------------------

function addChat(sender, text) {
  const box = $("chatMessages");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "chat-line";
  div.innerText = `${sender}: ${text}`;

  box.appendChild(div);
  box.scrollTo({
    top: box.scrollHeight,
    behavior: "smooth"
  });
}

window.addChat = addChat;
