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

function showToast(message, type = "info", duration = 3200) {
  const container = ensureToastContainer();

  const icons = { success: "✅", error: "⚠️", info: "ℹ️" };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-text">${message}</span>`;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
               }
