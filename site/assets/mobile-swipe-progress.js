/* Nodeck mobile swipe progress enhancement.
 * Reuses the source-owned scroll progress widget and delegates completed
 * transitions to the existing Prev/Next buttons, keeping the deck slider
 * as the only navigation owner.
 */
(() => {
  "use strict";

  const MOBILE_QUERY = "(hover: none) and (pointer: coarse)";
  const touchCapable = () => (
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window ||
    window.TouchEvent !== undefined
  );
  const shouldEnhanceTouch = () => touchCapable() && window.innerWidth <= 900;
  const viewportHeight = () => Math.max(
    1,
    window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 1
  );
  const commitDistance = () => Math.min(264, Math.max(220, viewportHeight() * 0.32));
  const AXIS_LOCK_PX = 8;
  const AXIS_DOMINANCE = 1.2;
  const COMMIT_HOLD_MS = 1000;
  const RESET_AFTER_NAV_MS = 1700;
  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const widget = document.getElementById("scroll-nav-overlay");
  const ring = widget?.querySelector(".scroll-nav__ring-progress");
  const check = widget?.querySelector(".scroll-nav__check");
  const label = widget?.querySelector(".scroll-nav__label");
  const prevButton = document.getElementById("nav-prev-slide-btn");
  const nextButton = document.getElementById("nav-next-slide-btn");
  const soundButton = document.getElementById("sound-toggle-btn");

  if (!widget || !ring || !check || !label || !prevButton || !nextButton) return;

  const mobileMedia = window.matchMedia(MOBILE_QUERY);
  document.documentElement.dataset.mobileSwipeAdapter = "loaded";
  document.documentElement.dataset.mobileSwipeTouchCapable = String(touchCapable());
  document.documentElement.dataset.mobileSwipeMq = String(mobileMedia.matches);
  const checkLength = check.getTotalLength?.() || 54;
  let touchId = null;
  let startX = 0;
  let startY = 0;
  let axis = null;
  let direction = 0;
  let progress = 0;
  let committed = false;
  let committing = false;
  let commitTimer = 0;
  let resetTimer = 0;
  let firstCompletedInteractionHandled = false;
  let soundEnableRequested = false;
  let soundAutoEnabled = false;
  let hapticSwitch = null;
  let hapticPulseCount = 0;

  const isModalOpen = () => Boolean(
    document.querySelector("dialog[data-modal][open], dialog[open], .projects.is-open") ||
    document.getElementById("nav-overlay")?.getAttribute("aria-hidden") === "false"
  );

  const transitionRunning = () => Boolean(
    document.querySelector(".slide-transition")?.getAttribute("aria-hidden") === "false" ||
    document.querySelector(".paper-transition__canvas")?.offsetParent
  );

  const isInteractiveTarget = (target) => target instanceof Element && Boolean(
    target.closest("button, a, input, textarea, select, [contenteditable='true'], dialog, .swiper, .project, [data-swiper-proof], [data-swiper-what-we-do], [data-swiper-workwith]")
  );

  const canNavigate = (dir) => {
    const button = dir > 0 ? nextButton : prevButton;
    return !button.disabled && !button.closest("[inert]");
  };

  const ensureHapticSwitch = () => {
    if (hapticSwitch?.isConnected) return hapticSwitch;
    const label = document.createElement("label");
    label.className = "mobile-haptic-switch";
    label.setAttribute("aria-hidden", "true");
    hapticSwitch = document.createElement("input");
    hapticSwitch.type = "checkbox";
    hapticSwitch.setAttribute("switch", "");
    hapticSwitch.tabIndex = -1;
    label.appendChild(hapticSwitch);
    document.body.appendChild(label);
    return hapticSwitch;
  };

  const playSuccessHaptic = () => {
    hapticPulseCount += 1;
    document.documentElement.dataset.mobileHapticPulseCount = String(hapticPulseCount);
    let standardTriggered = false;
    try {
      standardTriggered = typeof navigator.vibrate === "function" && navigator.vibrate([26, 42, 36]);
    } catch {}
    if (standardTriggered) return;
    try {
      const input = ensureHapticSwitch();
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
  };

  const enableSoundAfterFirstCompletedInteraction = (event) => {
    if (firstCompletedInteractionHandled || soundEnableRequested || !shouldEnhanceTouch() || !event.isTrusted || !soundButton) return;
    soundEnableRequested = true;
    document.documentElement.dataset.mobileFirstInteractionComplete = "true";
    if (!soundButton.classList.contains("is-muted")) {
      firstCompletedInteractionHandled = true;
      soundAutoEnabled = true;
      document.documentElement.dataset.mobileSoundAutoEnabled = "already-on";
      return;
    }
    // The source module owns sound state. Dispatch an explicit request that it
    // handles synchronously inside this real touchend stack; never synthesize
    // button.click(), because iOS Safari does not transfer user activation.
    window.dispatchEvent(new CustomEvent("nodeck:enable-sound"));
  };

  window.addEventListener("nodeck:sound-enabled", () => {
    firstCompletedInteractionHandled = true;
    soundEnableRequested = false;
    soundAutoEnabled = !soundButton.classList.contains("is-muted");
    document.documentElement.dataset.mobileSoundAutoEnabled = String(soundAutoEnabled);
  });
  window.addEventListener("nodeck:sound-enable-failed", () => {
    soundEnableRequested = false;
    document.documentElement.dataset.mobileSoundAutoEnabled = "false";
  });

  const paint = (value) => {
    progress = Math.max(0, Math.min(value, 1));
    ring.style.strokeDasharray = String(CIRCUMFERENCE);
    ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    widget.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
  };

  const paintCheck = (value) => {
    check.style.strokeDasharray = String(checkLength);
    check.style.strokeDashoffset = String(checkLength * (1 - value));
  };

  const show = () => {
    widget.style.display = "flex";
    widget.classList.add("is-touch-active");
    widget.style.visibility = "visible";
    widget.style.opacity = "1";
  };

  const hide = () => {
    widget.classList.remove("is-touch-active", "is-touch-success");
    widget.style.visibility = "hidden";
    widget.style.opacity = "0";
  };

  const clearTimers = () => {
    window.clearTimeout(commitTimer);
    window.clearTimeout(resetTimer);
    commitTimer = 0;
    resetTimer = 0;
  };

  const reset = ({ animate = true } = {}) => {
    clearTimers();
    touchId = null;
    axis = null;
    direction = 0;
    committed = false;
    committing = false;
    label.textContent = "NEXT SLIDE";
    widget.classList.remove("is-touch-success");
    widget.style.setProperty("--touch-reset-duration", animate ? "360ms" : "0ms");
    paint(0);
    paintCheck(0);
    hide();
  };

  const cancelGesture = () => {
    if (!committing && progress > 0) reset({ animate: true });
    else if (!committing) reset({ animate: false });
  };

  const commit = () => {
    if (committing || !direction || !canNavigate(direction)) {
      cancelGesture();
      return;
    }
    committing = true;
    committed = true;
    paint(1);
    label.textContent = "LET'S GO!";
    widget.classList.add("is-touch-success");
    paintCheck(1);
    playSuccessHaptic();

    commitTimer = window.setTimeout(() => {
      const button = direction > 0 ? nextButton : prevButton;
      button.click();
      widget.style.opacity = "0";
      resetTimer = window.setTimeout(() => reset({ animate: false }), RESET_AFTER_NAV_MS);
    }, COMMIT_HOLD_MS);
  };

  const start = (event) => {
    if (!shouldEnhanceTouch() || touchId !== null || committed || committing) return;
    if (event.touches.length !== 1 || isModalOpen() || transitionRunning() || isInteractiveTarget(event.target)) return;
    const touch = event.changedTouches[0];
    touchId = touch.identifier;
    startX = touch.clientX;
    startY = touch.clientY;
    axis = null;
    direction = 0;
    paint(0);
    paintCheck(0);
  };

  const move = (event) => {
    if (!shouldEnhanceTouch() || touchId === null || committing) return;
    const touch = [...event.changedTouches].find((item) => item.identifier === touchId) ||
      [...event.touches].find((item) => item.identifier === touchId);
    if (!touch) return;

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!axis) {
      if (Math.max(absX, absY) < AXIS_LOCK_PX) return;
      axis = absY > absX * AXIS_DOMINANCE ? "vertical" : "horizontal";
      if (axis !== "vertical") {
        reset({ animate: false });
        return;
      }
    }

    if (axis !== "vertical") return;
    event.preventDefault();

    // Finger moving upward advances the deck; moving downward goes back.
    const nextDirection = dy < 0 ? 1 : -1;
    if (!canNavigate(nextDirection) || isModalOpen() || transitionRunning()) {
      cancelGesture();
      return;
    }

    if (direction && direction !== nextDirection) {
      paint(0);
      paintCheck(0);
    }
    direction = nextDirection;
    label.textContent = direction > 0 ? "NEXT SLIDE" : "PREV SLIDE";
    widget.setAttribute("aria-label", direction > 0 ? "Swipe up to next slide" : "Swipe down to previous slide");
    show();
    paint(Math.abs(dy) / commitDistance());
    if (progress >= 1) commit();
  };

  const end = (event) => {
    enableSoundAfterFirstCompletedInteraction(event);
    if (touchId === null) return;
    const ended = [...event.changedTouches].some((item) => item.identifier === touchId);
    if (!ended) return;
    if (!committing) cancelGesture();
    touchId = null;
  };

  widget.classList.add("is-touch-enhanced");
  widget.setAttribute("role", "progressbar");
  widget.setAttribute("aria-valuemin", "0");
  widget.setAttribute("aria-valuemax", "100");
  ensureHapticSwitch();
  if (shouldEnhanceTouch()) document.documentElement.classList.add("mobile-swipe-touch-capable");
  reset({ animate: false });

  window.addEventListener("touchstart", start, { passive: true, capture: true });
  window.addEventListener("touchmove", move, { passive: false, capture: true });
  window.addEventListener("touchend", end, { passive: true, capture: true });
  window.addEventListener("touchcancel", end, { passive: true, capture: true });
  document.addEventListener("visibilitychange", () => document.hidden && reset({ animate: false }));
  mobileMedia.addEventListener?.("change", () => reset({ animate: false }));
})();
