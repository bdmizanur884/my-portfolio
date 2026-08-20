/* ==========================================================
   MAIN SITE LOGIC
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initHamburger();
  loadProfile();
  loadSkills();
  loadServices();
  loadProjects();
  loadSettingsIntoSocials();
  initContactForm();
  initOfflineBanner();
});

/* ---------------- Hamburger menu ---------------- */
function initHamburger() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    menu.classList.toggle("open");
    toggle.classList.toggle("open");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.classList.remove("open");
    });
  });
}

/* ---------------- Profile / Hero / About ---------------- */
async function loadProfile() {
  try {
    const { data, error } = await supabaseClient
      .from("profile")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) return;

    setText("heroName", data.name);
    setText("heroProfession", data.profession);
    setText("heroDescription", data.hero_description);

    setText("aboutName", data.name);
    setText("aboutProfession", data.profession);
    setText("aboutLocation", data.location || "—");
    setText("aboutExperience", data.experience || "—");
    setText("aboutBio", data.bio || "");

    const avatarEls = document.querySelectorAll(".profile-avatar");
    if (data.avatar_url) {
      avatarEls.forEach((el) => (el.src = data.avatar_url));
    }
  } catch (err) {
    console.error("Failed to load profile:", err);
  }
}

/* ---------------- Skills ---------------- */
async function loadSkills() {
  const box = document.getElementById("skillsGrid");
  if (!box) return;

  try {
    const { data, error } = await supabaseClient
      .from("skills")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      box.innerHTML = `<div class="empty">🛠️<br><br>No skills added yet.</div>`;
      return;
    }

    box.innerHTML = data
      .map(
        (s) => `
      <div class="skill-card">
        <div class="skill-top">
          <span>${escapeHtml(s.name)}</span>
          <span>${s.level ?? 80}%</span>
        </div>
        <div class="skill-bar">
          <div class="skill-fill" style="width:${s.level ?? 80}%"></div>
        </div>
      </div>`
      )
      .join("");
  } catch (err) {
    console.error("Failed to load skills:", err);
    box.innerHTML = `<div class="empty">Could not load skills.</div>`;
  }
}

/* ---------------- Services ---------------- */
async function loadServices() {
  const box = document.getElementById("servicesGrid");
  if (!box) return;

  try {
    const { data, error } = await supabaseClient
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      box.innerHTML = `<div class="empty">🧰<br><br>No services listed yet.</div>`;
      return;
    }

    box.innerHTML = data
      .map(
        (s) => `
      <div class="service-card">
        <div class="service-icon">${s.icon || "⭐"}</div>
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.description || "")}</p>
      </div>`
      )
      .join("");
  } catch (err) {
    console.error("Failed to load services:", err);
    box.innerHTML = `<div class="empty">Could not load services.</div>`;
  }
}

/* ---------------- Projects ---------------- */
async function loadProjects() {
  const box = document.getElementById("projectsGrid");
  if (!box) return;

  try {
    const { data, error } = await supabaseClient
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      box.innerHTML = `<div class="empty">📁<br><br>No projects available yet.</div>`;
      return;
    }

    box.innerHTML = data
      .map(
        (p) => `
      <div class="project-card">
        ${p.image_url ? `<img src="${p.image_url}" alt="${escapeHtml(p.title)}" loading="lazy">` : ""}
        <div class="project-body">
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description || "")}</p>
          ${p.tech ? `<div class="project-tech">${escapeHtml(p.tech)}</div>` : ""}
          <div class="project-links">
            ${p.demo_url ? `<a href="${p.demo_url}" target="_blank" rel="noopener" class="btn-small">Live Demo</a>` : ""}
            ${p.source_url ? `<a href="${p.source_url}" target="_blank" rel="noopener" class="btn-small btn-outline">Source Code</a>` : ""}
          </div>
        </div>
      </div>`
      )
      .join("");
  } catch (err) {
    console.error("Failed to load projects:", err);
    box.innerHTML = `<div class="empty">Could not load projects.</div>`;
  }
}

/* ---------------- Settings / Social links ---------------- */
async function loadSettingsIntoSocials() {
  try {
    const { data, error } = await supabaseClient
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) return;

    const map = {
      social_facebook: "linkFacebook",
      social_instagram: "linkInstagram",
      social_youtube: "linkYoutube",
      social_tiktok: "linkTiktok",
      social_github: "linkGithub",
      social_linkedin: "linkLinkedin",
    };

    Object.entries(map).forEach(([field, elId]) => {
      const el = document.getElementById(elId);
      if (el && data[field]) {
        el.href = data[field];
        el.style.display = "inline-flex";
      } else if (el) {
        el.style.display = "none";
      }
    });

    if (data.contact_email) setText("contactEmailDisplay", data.contact_email);
    if (data.contact_phone) setText("contactPhoneDisplay", data.contact_phone);
    if (data.site_title) document.title = data.site_title;
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

/* ---------------- Contact form ---------------- */
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showToast("Please fill in name, email and message.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "Sending...";

    try {
      const { error } = await supabaseClient
        .from("messages")
        .insert([{ name, email, subject, message }]);

      if (error) throw error;

      showToast("Message sent successfully!", "success");
      form.reset();
    } catch (err) {
      console.error(err);
      showToast("Message sent failed. Please try again.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  });
}

/* ---------------- Offline banner ---------------- */
function initOfflineBanner() {
  const banner = document.getElementById("offlineBanner");
  if (!banner) return;

  function update() {
    banner.style.display = navigator.onLine ? "none" : "block";
  }
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

/* ---------------- Utilities ---------------- */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.innerText = value;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
