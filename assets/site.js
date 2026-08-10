(function () {
  "use strict";

  const menuButton = document.querySelector("[data-menu-button]");
  const mobileNav = document.querySelector("[data-mobile-nav]");

  if (menuButton && mobileNav) {
    menuButton.addEventListener("click", function () {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!open));
      mobileNav.classList.toggle("is-open", !open);
    });

    mobileNav.addEventListener("click", function (event) {
      if (!event.target.closest("a")) return;
      menuButton.setAttribute("aria-expanded", "false");
      mobileNav.classList.remove("is-open");
    });
  }

  const audioPlayers = Array.from(document.querySelectorAll("[data-episode-audio]"));
  const pendingStates = Array.from(document.querySelectorAll("[data-audio-pending]"));
  const audioCtas = Array.from(document.querySelectorAll("[data-audio-cta]"));
  const gateCells = Array.from(document.querySelectorAll("[data-gate-status]"));

  audioCtas.forEach(function (cta) {
    cta.addEventListener("click", function (event) {
      if (cta.getAttribute("aria-disabled") === "true") event.preventDefault();
    });
  });

  if (!audioPlayers.length && !gateCells.length) return;

  fetch("site-status.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("site status unavailable");
      return response.json();
    })
    .then(function (status) {
      if (status.audio_available === true && status.episode_audio) {
        audioPlayers.forEach(function (player) {
          player.src = player.dataset.audioSrc || status.episode_audio;
          player.hidden = false;
          player.dataset.releaseState = "available";
        });
        pendingStates.forEach(function (pending) {
          pending.hidden = true;
        });
        audioCtas.forEach(function (cta) {
          cta.setAttribute("aria-disabled", "false");
          const label = cta.querySelector("[data-audio-cta-label]");
          if (label) label.textContent = cta.dataset.audioLabel || status.audio_cta_label || "Play latest episode";
        });
      }

      const gateLabels = {
        pass: "Passed",
        pending: "Awaiting signed receipt",
        block: "Blocked"
      };

      gateCells.forEach(function (cell) {
        const gate = cell.dataset.gateStatus;
        const state = status.gates && status.gates[gate] ? status.gates[gate] : "pending";
        cell.textContent = gateLabels[state] || state;
        cell.classList.toggle("status-pass", state === "pass");
        cell.classList.toggle("status-block", state === "block");
        cell.classList.toggle("status-pending", state === "pending");
      });
    })
    .catch(function () {
      // Fail closed. Static pending states remain visible and no audio URL is requested.
    });
})();
