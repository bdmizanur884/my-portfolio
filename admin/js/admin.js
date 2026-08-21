/* ==========================================================
   ADMIN DASHBOARD LOGIC
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return; // redirected to login

  initSidebar();
  loadOverviewStats();
  initProfileForm();
  initSkills();
  initServices();
  initProjects();
  initGalleryModeration();
  initDeleteRequests();
  initMessages();
  initSettingsForm();
});

/* ---------------- Sidebar navigation ---------------- */
function initSidebar() {
  const buttons = document.querySelectorAll(".admin-nav-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".admin-section").forEach((s) => s.classList.remove("active"));
      document.getElementById(`section-${btn.dataset.section}`).classList.add("active");
    });
  });
}

/* ---------------- Overview stats ---------------- */
async function loadOverviewStats() {
  try {
    const [photos, projects, messages, pending] = await Promise.all([
      supabaseClient.from("gallery").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabaseClient.from("projects").select("id", { count: "exact", head: true }),
      supabaseClient.from("messages").select("id", { count: "exact", head: true }),
      supabaseClient.from("delete_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    setText("statPhotos", photos.count ?? 0);
    setText("statProjects", projects.count ?? 0);
    setText("statMessages", messages.count ?? 0);
    setText("statPending", pending.count ?? 0);
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

/* ---------------- Profile ---------------- */
function initProfileForm() {
  const form = document.getElementById("profileForm");
  if (!form) return;

  (async () => {
    try {
      const { data, error } = await supabaseClient.from("profile").select("*").limit(1).single();
      if (error) throw error;
      if (data) {
        form.name.value = data.name || "";
        form.profession.value = data.profession || "";
        form.location.value = data.location || "";
        form.experience.value = data.experience || "";
        form.avatar_url.value = data.avatar_url || "";
        form.hero_description.value = data.hero_description || "";
        form.bio.value = data.bio || "";
        form.dataset.id = data.id;
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.value.trim(),
      profession: form.profession.value.trim(),
      location: form.location.value.trim(),
      experience: form.experience.value.trim(),
      avatar_url: form.avatar_url.value.trim(),
      hero_description: form.hero_description.value.trim(),
      bio: form.bio.value.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = form.dataset.id
        ? await supabaseClient.from("profile").update(payload).eq("id", form.dataset.id)
        : await supabaseClient.from("profile").insert([payload]);
      if (error) throw error;
      showToast("Profile saved", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save profile", "error");
    }
  });
}

/* ---------------- Skills ---------------- */
function initSkills() {
  const form = document.getElementById("skillForm");
  const list = document.getElementById("skillsList");
  if (!form || !list) return;

  loadSkillsList();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const level = parseInt(form.level.value) || 80;
    if (!name) return;

    try {
      const { error } = await supabaseClient.from("skills").insert([{ name, level }]);
      if (error) throw error;
      showToast("Skill added", "success");
      form.reset();
      form.level.value = 80;
      loadSkillsList();
    } catch (err) {
      console.error(err);
      showToast("Failed to add skill", "error");
    }
  });

  async function loadSkillsList() {
    list.innerHTML = `<div class="empty">Loading...</div>`;
    try {
      const { data, error } = await supabaseClient.from("skills").select("*").order("sort_order");
      if (error) throw error;

      if (!data || data.length === 0) {
        list.innerHTML = `<div class="empty">No skills yet.</div>`;
        return;
      }

      list.innerHTML = data
        .map(
          (s) => `
        <div class="admin-list-item">
          <div><strong>${escapeHtml(s.name)}</strong> — ${s.level}%</div>
          <button class="delete-request" data-id="${s.id}" data-table="skills">🗑️ Delete</button>
        </div>`
        )
        .join("");

      attachDeleteHandlers(list, loadSkillsList);
    } catch (err) {
      console.error(err);
      list.innerHTML = `<div class="empty">Could not load skills.</div>`;
    }
  }
}

/* ---------------- Services ---------------- */
function initServices() {
  const form = document.getElementById("serviceForm");
  const list = document.getElementById("servicesList");
  if (!form || !list) return;

  loadServicesList();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const icon = form.icon.value.trim() || "⭐";
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    if (!title) return;

    try {
      const { error } = await supabaseClient.from("services").insert([{ icon, title, description }]);
      if (error) throw error;
      showToast("Service added", "success");
      form.reset();
      loadServicesList();
    } catch (err) {
      console.error(err);
      showToast("Failed to add service", "error");
    }
  });

  async function loadServicesList() {
    list.innerHTML = `<div class="empty">Loading...</div>`;
    try {
      const { data, error } = await supabaseClient.from("services").select("*").order("sort_order");
      if (error) throw error;

      if (!data || data.length === 0) {
        list.innerHTML = `<div class="empty">No services yet.</div>`;
        return;
      }

      list.innerHTML = data
        .map(
          (s) => `
        <div class="admin-list-item">
          <div>${s.icon} <strong>${escapeHtml(s.title)}</strong><br><span style="color:#8f9ab0;font-size:13px;">${escapeHtml(s.description || "")}</span></div>
          <button class="delete-request" data-id="${s.id}" data-table="services">🗑️ Delete</button>
        </div>`
        )
        .join("");

      attachDeleteHandlers(list, loadServicesList);
    } catch (err) {
      console.error(err);
      list.innerHTML = `<div class="empty">Could not load services.</div>`;
    }
  }
}

/* ---------------- Projects ---------------- */
function initProjects() {
  const form = document.getElementById("projectForm");
  const list = document.getElementById("projectsList");
  if (!form || !list) return;

  loadProjectsList();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      tech: form.tech.value.trim(),
      image_url: form.image_url.value.trim(),
      demo_url: form.demo_url.value.trim(),
      source_url: form.source_url.value.trim(),
    };
    if (!payload.title) return;

    try {
      const { error } = await supabaseClient.from("projects").insert([payload]);
      if (error) throw error;
      showToast("Project added", "success");
      form.reset();
      loadProjectsList();
      loadOverviewStats();
    } catch (err) {
      console.error(err);
      showToast("Failed to add project", "error");
    }
  });

  async function loadProjectsList() {
    list.innerHTML = `<div class="empty">Loading...</div>`;
    try {
      const { data, error } = await supabaseClient.from("projects").select("*").order("sort_order");
      if (error) throw error;

      if (!data || data.length === 0) {
        list.innerHTML = `<div class="empty">No projects yet.</div>`;
        return;
      }

      list.innerHTML = data
        .map(
          (p) => `
        <div class="admin-list-item">
          <div><strong>${escapeHtml(p.title)}</strong><br><span style="color:#8f9ab0;font-size:13px;">${escapeHtml(p.tech || "")}</span></div>
          <button class="delete-request" data-id="${p.id}" data-table="projects">🗑️ Delete</button>
        </div>`
        )
        .join("");

      attachDeleteHandlers(list, () => {
        loadProjectsList();
        loadOverviewStats();
      });
    } catch (err) {
      console.error(err);
      list.innerHTML = `<div class="empty">Could not load projects.</div>`;
    }
  }
}

/* ---------------- Gallery moderation ---------------- */
function initGalleryModeration() {
  const grid = document.getElementById("adminGalleryGrid");
  if (!grid) return;

  loadAdminGallery();

  async function loadAdminGallery() {
    grid.innerHTML = `<div class="empty">Loading...</div>`;
    try {
      const { data, error } = await supabaseClient
        .from("gallery")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        grid.innerHTML = `<div class="empty">📷<br><br>No photos in the gallery yet.</div>`;
        return;
      }

      grid.innerHTML = data
        .map(
          (item) => `
        <div class="admin-photo-card">
          <img src="${item.image_url}" alt="${escapeHtml(item.file_name || "")}">
          <div class="admin-photo-meta">${escapeHtml(item.file_name || "")}<br><span style="color:#8f9ab0;">${escapeHtml(item.category || "")}</span></div>
          <button class="delete-request" data-gallery-id="${item.id}">🗑️ Delete</button>
        </div>`
        )
        .join("");

      grid.querySelectorAll("[data-gallery-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this photo from the public gallery?")) return;
          try {
            const { error } = await supabaseClient
              .from("gallery")
              .update({ status: "deleted" })
              .eq("id", btn.dataset.galleryId);
            if (error) throw error;
            showToast("Image deleted", "success");
            loadAdminGallery();
            loadOverviewStats();
          } catch (err) {
            console.error(err);
            showToast("Failed to delete image", "error");
          }
        });
      });
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="empty">Could not load gallery.</div>`;
    }
  }
}

/* ---------------- Delete requests ---------------- */
function initDeleteRequests() {
  const list = document.getElementById("deleteRequestsList");
  if (!list) return;

  loadRequests();

  async function loadRequests() {
    list.innerHTML = `<div class="empty">Loading...</div>`;
    try {
      const { data, error } = await supabaseClient
        .from("delete_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        list.innerHTML = `<div class="empty">No delete requests.</div>`;
        return;
      }

      list.innerHTML = data
        .map(
          (r) => `
        <div class="admin-list-item">
          <img src="${r.image_url}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-right:10px;">
          <div style="flex:1;">
            <span class="status-badge status-${r.status}">${r.status}</span><br>
            <span style="color:#8f9ab0;font-size:12px;">${new Date(r.created_at).toLocaleString()}</span>
          </div>
          ${
            r.status === "pending"
              ? `<div style="display:flex;gap:6px;">
                  <button class="btn-small" data-approve="${r.id}" data-gallery="${r.gallery_id}">✅ Approve</button>
                  <button class="delete-request" data-reject="${r.id}">❌ Reject</button>
                </div>`
              : ""
          }
        </div>`
        )
        .join("");

      list.querySelectorAll("[data-approve]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await supabaseClient.from("gallery").update({ status: "deleted" }).eq("id", btn.dataset.gallery);
            await supabaseClient.from("delete_requests").update({ status: "approved" }).eq("id", btn.dataset.approve);
            showToast("Delete request approved — image removed", "success");
            loadRequests();
            loadOverviewStats();
          } catch (err) {
            console.error(err);
            showToast("Failed to approve request", "error");
          }
        });
      });

      list.querySelectorAll("[data-reject]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await supabaseClient.from("delete_requests").update({ status: "rejected" }).eq("id", btn.dataset.reject);
            showToast("Request rejected", "success");
            loadRequests();
            loadOverviewStats();
          } catch (err) {
            console.error(err);
            showToast("Failed to reject request", "error");
          }
        });
      });
    } catch (err) {
      console.error(err);
      list.innerHTML = `<div class="empty">Could not load delete requests.</div>`;
    }
  }
}

/* ---------------- Messages ---------------- */
function initMessages() {
  const list = document.getElementById("messagesList");
  if (!list) return;

  loadMessages();

  async function loadMessages() {
    list.innerHTML = `<div class="empty">Loading...</div>`;
    try {
      const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        list.innerHTML = `<div class="empty">No messages yet.</div>`;
        return;
      }

      list.innerHTML = data
        .map(
          (m) => `
        <div class="admin-list-item" style="align-items:flex-start;">
          <div style="flex:1;">
            <strong>${escapeHtml(m.name)}</strong> — <span style="color:#8f9ab0;">${escapeHtml(m.email)}</span><br>
            <em style="color:#c3ccdd;">${escapeHtml(m.subject || "(no subject)")}</em>
            <p style="margin-top:6px;font-size:14px;color:#c3ccdd;">${escapeHtml(m.message)}</p>
            <span style="color:#8f9ab0;font-size:12px;">${new Date(m.created_at).toLocaleString()}</span>
          </div>
          <button class="delete-request" data-id="${m.id}" data-table="messages">🗑️ Delete</button>
        </div>`
        )
        .join("");

      attachDeleteHandlers(list, loadMessages);
    } catch (err) {
      console.error(err);
      list.innerHTML = `<div class="empty">Could not load messages.</div>`;
    }
  }
}

/* ---------------- Settings ---------------- */
function initSettingsForm() {
  const form = document.getElementById("settingsForm");
  if (!form) return;

  (async () => {
    try {
      const { data, error } = await supabaseClient.from("settings").select("*").limit(1).single();
      if (error) throw error;
      if (data) {
        Object.keys(data).forEach((key) => {
          if (form[key]) form[key].value = data[key] || "";
        });
        form.dataset.id = data.id;
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      site_title: form.site_title.value.trim(),
      contact_email: form.contact_email.value.trim(),
      contact_phone: form.contact_phone.value.trim(),
      social_facebook: form.social_facebook.value.trim(),
      social_instagram: form.social_instagram.value.trim(),
      social_youtube: form.social_youtube.value.trim(),
      social_tiktok: form.social_tiktok.value.trim(),
      social_github: form.social_github.value.trim(),
      social_linkedin: form.social_linkedin.value.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = form.dataset.id
        ? await supabaseClient.from("settings").update(payload).eq("id", form.dataset.id)
        : await supabaseClient.from("settings").insert([payload]);
      if (error) throw error;
      showToast("Settings saved", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save settings", "error");
    }
  });
}

/* ---------------- Shared: generic delete-by-table handler ---------------- */
function attachDeleteHandlers(container, reload) {
  container.querySelectorAll("[data-table]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      try {
        const { error } = await supabaseClient.from(btn.dataset.table).delete().eq("id", btn.dataset.id);
        if (error) throw error;
        showToast("Deleted", "success");
        reload();
      } catch (err) {
        console.error(err);
        showToast("Failed to delete", "error");
      }
    });
  });
}

/* ---------------- Utilities ---------------- */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
