// ---------------- DOM Helpers (FIXED) ----------------

// Safe element selector
function $(id) {
  return document.getElementById(id) || null;
}

// Safe show / hide helpers
function show(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("hidden");
}

function hide(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add("hidden");
}

// Export globals
window.$ = $;
window.show = show;
window.hide = hide;
