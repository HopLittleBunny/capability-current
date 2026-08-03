(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var menuButton = document.querySelector("[data-menu-button]");
  var mobileNav = document.querySelector("[data-mobile-nav]");

  if (menuButton && mobileNav) {
    menuButton.addEventListener("click", function () {
      var open = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!open));
      mobileNav.classList.toggle("is-open", !open);
    });

    mobileNav.addEventListener("click", function (event) {
      if (!event.target.closest("a")) return;
      menuButton.setAttribute("aria-expanded", "false");
      mobileNav.classList.remove("is-open");
    });
  }

  // Header elevation once the page is scrolled (sentinel, no scroll listener).
  var header = document.querySelector("[data-site-header]") || document.querySelector(".site-header");
  if (header && "IntersectionObserver" in window) {
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      header.classList.toggle("is-stuck", !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  // Reveal-on-scroll.
  var revealables = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (revealables.length) {
    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealables.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.15 });
      revealables.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  // Copy RSS feed URL.
  var feedCopy = document.querySelector("[data-feed-copy]");
  if (feedCopy) {
    feedCopy.addEventListener("click", function () {
      var code = feedCopy.parentElement.querySelector("code");
      if (!code || !navigator.clipboard) return;
      navigator.clipboard.writeText(code.textContent.trim()).then(function () {
        var original = feedCopy.textContent;
        feedCopy.textContent = "Copied";
        window.setTimeout(function () { feedCopy.textContent = original; }, 1600);
      });
    });
  }

  var audioPlayers = Array.prototype.slice.call(document.querySelectorAll("[data-episode-audio]"));
  var pendingStates = Array.prototype.slice.call(document.querySelectorAll("[data-audio-pending]"));
  var audioCtas = Array.prototype.slice.call(document.querySelectorAll("[data-audio-cta]"));
  var gateCells = Array.prototype.slice.call(document.querySelectorAll("[data-gate-status]"));
  var waveforms = Array.prototype.slice.call(document.querySelectorAll("[data-waveform]"));

  audioCtas.forEach(function (cta) {
    cta.addEventListener("click", function (event) {
      if (cta.getAttribute("aria-disabled") === "true") event.preventDefault();
    });
  });

  // The waveform only dances while real audio is actually playing.
  audioPlayers.forEach(function (player) {
    player.addEventListener("play", function () {
      waveforms.forEach(function (w) { w.classList.add("is-live"); });
    });
    ["pause", "ended"].forEach(function (evt) {
      player.addEventListener(evt, function () {
        waveforms.forEach(function (w) { w.classList.remove("is-live"); });
      });
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
          player.src = status.episode_audio;
          player.hidden = false;
          player.dataset.releaseState = "available";
        });
        pendingStates.forEach(function (pending) {
          pending.hidden = true;
        });
        audioCtas.forEach(function (cta) {
          cta.setAttribute("aria-disabled", "false");
          var label = cta.querySelector("[data-audio-cta-label]");
          if (label) label.textContent = "Play Episode 001";
        });
      }

      var gateLabels = {
        pass: "Passed",
        pending: "Awaiting signed receipt",
        block: "Blocked"
      };

      gateCells.forEach(function (cell) {
        var gate = cell.dataset.gateStatus;
        var state = status.gates && status.gates[gate] ? status.gates[gate] : "pending";
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
