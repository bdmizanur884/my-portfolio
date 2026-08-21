/* ==========================================================
   Toast notifications (replaces browser alert())
   Usage: showToast("Upload successful", "success")
   types: "success" | "error" | "info"
   ========================================================== */

function ensureToastContainer() {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = "info", duration = 4500) {
  const container = ensureToastContainer();

  // Cap stacked toasts so errors from repeated taps can't pile up forever
  while (container.children.length >= 3) {
    container.firstElementChild.remove();
  }

  const icons = { success: "✅", error: "⚠️", info: "ℹ️" };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-text">${message}</span><button class="toast-close" aria-label="Close">✕</button>`;

  const removeToast = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector(".toast-close").addEventListener("click", removeToast);

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(removeToast, duration);
                                                }
