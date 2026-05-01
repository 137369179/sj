document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll("[data-nav]");

  navLinks.forEach((link) => {
    const target = link.getAttribute("href");
    if (!target) return;

    const normalizedTarget = target.replace("./", "");
    if (normalizedTarget === currentPath || (currentPath === "" && normalizedTarget === "index.html")) {
      link.classList.add("is-active");
    }
  });

  const ctaButtons = document.querySelectorAll("[data-cta-label]");
  ctaButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const label = button.getAttribute("data-cta-label");
      const status = document.querySelector("[data-cta-status]");

      if (!status || !label) return;
      status.textContent = `已选择：${label}，下一阶段可继续接入真实表单、咨询入口或业务流程。`;
    });
  });

  const header = document.querySelector(".site-header");
  if (header && window.innerWidth < 640) {
    header.classList.add("is-compact");
  }
});
