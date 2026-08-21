/* ==========================================================
   ADMIN AUTH
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) initLoginForm();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      window.location.href = "index.html";
    });
  }
});

function initLoginForm() {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  // If already logged in, skip straight to dashboard
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data?.session) window.location.href = "dashboard.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.email.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (errorBox) errorBox.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.innerText = "Logging in...";

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      if (errorBox) {
        errorBox.innerText = "Login failed. Check your email and password.";
        errorBox.style.display = "block";
      }
      submitBtn.disabled = false;
      submitBtn.innerText = "Log In";
    }
  });
}

/* Call at the top of every protected admin page */
async function requireAdmin() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data?.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}
