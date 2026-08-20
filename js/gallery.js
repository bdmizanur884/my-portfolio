/* ==========================================================
   GALLERY: upload, preview, load, search/filter, viewer, actions
   ========================================================== */

const MAX_FILE_SIZE_MB = 8;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const PAGE_SIZE = 12;

let galleryPage = 0;
let galleryItems = [];
let currentCategory = "All";
let currentSearch = "";
let viewerIndex = 0;
let selectedFilesQueue = [];

document.addEventListener("DOMContentLoaded", () => {
  initUpload();
  initPreviewPanel();
  initViewer();
  initDeleteRequestPopup();
  initSearchFilter();
  loadGalleryPage(true);

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => loadGalleryPage(false));
});

/* ---------------- Upload ---------------- */
function initUpload() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput) return;

  fileInput.addEventListener("change", function () {
    const files = Array.from(this.files);
    if (files.length === 0) return;

    const valid = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        showToast(`Invalid file: ${file.name} (only JPG, PNG, WEBP allowed)`, "error");
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(`File too large: ${file.name} (max ${MAX_FILE_SIZE_MB}MB)`, "error");
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) return;

    selectedFilesQueue = valid;
    renderPreview(valid);
    uploadFiles(valid);

    // reset input so selecting the same file again re-triggers change
    this.value = "";
  });
}

function renderPreview(files) {
  const previewGrid = document.getElementById("previewGrid");
  const folderText = document.getElementById("folderText");
  if (!previewGrid || !folderText) return;

  previewGrid.innerHTML = "";
  folderText.innerText = `${files.length}টি ছবি Preview-তে আছে`;

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const card = document.createElement("div");
      card.className = "preview-card";

      const img = document.createElement("img");
      img.src = e.target.result;
      img.alt = file.name;

      const meta = document.createElement("div");
      meta.className = "preview-meta";
      meta.innerText = `${file.name} · ${(file.size / 1024).toFixed(0)}KB`;

      card.appendChild(img);
      card.appendChild(meta);
      previewGrid.appendChild(card);
    };
    reader.readAsDataURL(file);
  });
}

function initPreviewPanel() {
  const previewFolder = document.getElementById("previewFolder");
  const previewPanel = document.getElementById("previewPanel");
  const closePreview = document.getElementById("closePreview");

  if (previewFolder && previewPanel) {
    previewFolder.addEventListener("click", () => {
      previewPanel.style.display = "block";
      previewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (closePreview && previewPanel) {
    closePreview.addEventListener("click", () => {
      previewPanel.style.display = "none";
    });
  }
}

async function uploadFiles(files) {
  const progressBox = document.getElementById("uploadProgress");
  if (progressBox) {
    progressBox.style.display = "block";
    progressBox.innerText = `Uploading 0 / ${files.length}...`;
  }

  let done = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const category = document.getElementById("uploadCategory")?.value || "Personal";

      // 1) Upload the actual image file to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "gallery");

      const cloudRes = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      const cloudData = await cloudRes.json();

      if (!cloudRes.ok) {
        throw new Error(cloudData?.error?.message || "Cloudinary upload failed");
      }

      const image_url = cloudData.secure_url;
      const public_id = cloudData.public_id; // used later if the image needs removing from Cloudinary

      // 2) Save only the URL + metadata in Supabase
      const { error: insertError } = await supabaseClient.from("gallery").insert([
        {
          image_url,
          storage_path: public_id,
          file_name: file.name,
          category,
          status: "active",
        },
      ]);

      if (insertError) throw insertError;

      done++;
    } catch (err) {
      console.error("Upload failed:", err);
      failed++;
    }

    if (progressBox) {
      progressBox.innerText = `Uploading ${done + failed} / ${files.length}...`;
    }
  }

  if (progressBox) progressBox.style.display = "none";

  if (done > 0) showToast(`Upload successful (${done} image${done > 1 ? "s" : ""})`, "success");
  if (failed > 0) showToast(`Upload failed for ${failed} file(s)`, "error");

  galleryPage = 0;
  loadGalleryPage(true);
}

/* ---------------- Search & filter ---------------- */
function initSearchFilter() {
  const searchBox = document.getElementById("gallerySearch");
  const filterButtons = document.querySelectorAll(".filter-btn");

  if (searchBox) {
    let debounce;
    searchBox.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentSearch = searchBox.value.trim();
        galleryPage = 0;
        loadGalleryPage(true);
      }, 300);
    });
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category;
      galleryPage = 0;
      loadGalleryPage(true);
    });
  });
}

/* ---------------- Load gallery (with pagination) ---------------- */
async function loadGalleryPage(reset) {
  const galleryBox = document.getElementById("galleryBox");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (!galleryBox) return;

  if (reset) {
    galleryPage = 0;
    galleryItems = [];
    galleryBox.innerHTML = `<div class="empty" id="loadingMsg">Loading photos...</div>`;
  }

  try {
    let query = supabaseClient
      .from("gallery")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(galleryPage * PAGE_SIZE, galleryPage * PAGE_SIZE + PAGE_SIZE - 1);

    if (currentCategory && currentCategory !== "All") {
      query = query.eq("category", currentCategory);
    }
    if (currentSearch) {
      query = query.or(`file_name.ilike.%${currentSearch}%,caption.ilike.%${currentSearch}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (reset) galleryItems = data || [];
    else galleryItems = galleryItems.concat(data || []);

    renderGallery();

    if (loadMoreBtn) {
      loadMoreBtn.style.display = data && data.length === PAGE_SIZE ? "block" : "none";
    }

    galleryPage++;
  } catch (err) {
    console.error("Failed to load gallery:", err);
    galleryBox.innerHTML = `<div class="empty">Could not load gallery. Please refresh.</div>`;
  }
}

function renderGallery() {
  const galleryBox = document.getElementById("galleryBox");
  const photoCount = document.getElementById("photoCount");
  if (!galleryBox) return;

  if (!galleryItems || galleryItems.length === 0) {
    galleryBox.innerHTML = `<div class="empty">📷<br><br>No photos available yet.<br>Be the first to add one.</div>`;
    if (photoCount) photoCount.innerText = "0 Photos";
    return;
  }

  galleryBox.innerHTML = galleryItems
    .map(
      (item, index) => `
    <div class="photo-card" data-id="${item.id}">
      <img src="${item.image_url}" alt="${escapeHtml(item.file_name || "")}" loading="lazy" onclick="openViewerAt(${index})">
      <div class="photo-name">${escapeHtml(item.file_name || "")}</div>
      <div class="link-box">
        <input class="link-input" type="text" readonly value="${item.image_url}">
        <button class="copy-btn" onclick="copyLink(this, '${item.image_url}')">📋 Copy</button>
      </div>
      <div class="actions">
        <a class="download" href="${item.image_url}" download="${escapeHtml(item.file_name || "photo")}">📥 Download</a>
        <button class="delete-request" onclick="openDeleteRequest('${item.id}', '${item.image_url}')">🗑️ Delete Request</button>
      </div>
    </div>`
    )
    .join("");

  if (photoCount) photoCount.innerText = `${galleryItems.length} Photos`;
}

/* ---------------- Copy link ---------------- */
async function copyLink(btn, url) {
  try {
    await navigator.clipboard.writeText(url);
  } catch (e) {
    const temp = document.createElement("input");
    temp.value = url;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
  const original = btn.innerText;
  btn.innerText = "✅ Copied!";
  showToast("Link copied to clipboard", "success");
  setTimeout(() => (btn.innerText = original), 1500);
}

/* ---------------- Full-screen viewer ---------------- */
function initViewer() {
  const viewer = document.getElementById("viewer");
  const closeViewer = document.getElementById("closeViewer");
  const nextBtn = document.getElementById("viewerNext");
  const prevBtn = document.getElementById("viewerPrev");

  if (closeViewer) closeViewer.addEventListener("click", closeViewerFunc);
  if (viewer) {
    viewer.addEventListener("click", (e) => {
      if (e.target === viewer) closeViewerFunc();
    });
  }
  if (nextBtn) nextBtn.addEventListener("click", () => stepViewer(1));
  if (prevBtn) prevBtn.addEventListener("click", () => stepViewer(-1));

  document.addEventListener("keydown", (e) => {
    if (viewer && viewer.style.display === "flex") {
      if (e.key === "Escape") closeViewerFunc();
      if (e.key === "ArrowRight") stepViewer(1);
      if (e.key === "ArrowLeft") stepViewer(-1);
    }
  });

  // basic mobile swipe
  let touchStartX = 0;
  if (viewer) {
    viewer.addEventListener("touchstart", (e) => (touchStartX = e.touches[0].clientX));
    viewer.addEventListener("touchend", (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) stepViewer(diff > 0 ? -1 : 1);
    });
  }
}

function openViewerAt(index) {
  viewerIndex = index;
  const viewer = document.getElementById("viewer");
  const viewerImage = document.getElementById("viewerImage");
  if (!viewer || !viewerImage || !galleryItems[index]) return;
  viewerImage.src = galleryItems[index].image_url;
  viewer.style.display = "flex";
}

function stepViewer(dir) {
  if (!galleryItems.length) return;
  viewerIndex = (viewerIndex + dir + galleryItems.length) % galleryItems.length;
  const viewerImage = document.getElementById("viewerImage");
  if (viewerImage) viewerImage.src = galleryItems[viewerIndex].image_url;
}

function closeViewerFunc() {
  const viewer = document.getElementById("viewer");
  const viewerImage = document.getElementById("viewerImage");
  if (viewer) viewer.style.display = "none";
  if (viewerImage) viewerImage.src = "";
}

/* ---------------- Delete request ---------------- */
let pendingDeleteGalleryId = null;
let pendingDeleteImageUrl = null;

function initDeleteRequestPopup() {
  const requestBox = document.getElementById("requestBox");
  const cancelRequest = document.getElementById("cancelRequest");
  const confirmRequest = document.getElementById("confirmRequest");

  if (cancelRequest) {
    cancelRequest.addEventListener("click", () => {
      requestBox.style.display = "none";
      pendingDeleteGalleryId = null;
    });
  }

  if (confirmRequest) {
    confirmRequest.addEventListener("click", async () => {
      if (!pendingDeleteGalleryId) return;

      confirmRequest.disabled = true;
      confirmRequest.innerText = "Sending...";

      try {
        const { error } = await supabaseClient.from("delete_requests").insert([
          {
            gallery_id: pendingDeleteGalleryId,
            image_url: pendingDeleteImageUrl,
            status: "pending",
          },
        ]);
        if (error) throw error;
        showToast("Delete request sent to admin", "success");
      } catch (err) {
        console.error(err);
        showToast("Could not send delete request", "error");
      } finally {
        confirmRequest.disabled = false;
        confirmRequest.innerText = "Send Request";
        requestBox.style.display = "none";
        pendingDeleteGalleryId = null;
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && requestBox) requestBox.style.display = "none";
  });
}

function openDeleteRequest(galleryId, imageUrl) {
  pendingDeleteGalleryId = galleryId;
  pendingDeleteImageUrl = imageUrl;
  const requestBox = document.getElementById("requestBox");
  if (requestBox) requestBox.style.display = "flex";
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
                             }
