// ================================
// 🎮 User Controls (FIXED)
// ================================

(function initControls() {
  document.addEventListener("DOMContentLoaded", () => {
    const chatInput = $("chatInput");
    const chatSend = $("chatSend");
    const copyBtn = $("copyInviteBtn");

    // ---------------- Enter key sends chat ----------------
    if (chatInput && chatSend) {
      chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          chatSend.click();
        }
      });
    }

    // ---------------- Space toggles play/pause ----------------
    document.addEventListener("keydown", e => {
      // Do not hijack typing
      if (
        document.activeElement === chatInput ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        const btn = $("playBtn");
        if (btn && !btn.disabled) {
          btn.click();
        }
      }
    });

    // ---------------- Copy invite link ----------------
    if (copyBtn) {
      copyBtn.onclick = async () => {
        try {
          const link = $("inviteLink")?.value;
          if (!link) return;

          await navigator.clipboard.writeText(link);
          alert("Invite link copied!");
        } catch (err) {
          console.error("Clipboard failed:", err);
          alert("Failed to copy link.");
        }
      };
    }
  });
})();
