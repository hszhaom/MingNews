const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const newsletterForm = document.querySelector(".newsletter-form");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

if (newsletterForm) {
  newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = newsletterForm.querySelector(".form-note");
    const input = newsletterForm.querySelector("input[type='email']");

    if (note && input instanceof HTMLInputElement) {
      note.textContent = "Thanks. Connect this form to your email service before production launch.";
      input.value = "";
    }
  });
}
