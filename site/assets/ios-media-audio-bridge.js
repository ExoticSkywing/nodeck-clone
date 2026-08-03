/* iOS 16 Safari HTMLMediaElement sound bridge.
 * Web Audio on iPhone follows the hardware silent switch; attached <audio>
 * elements use the media playback route. The bridge is enabled only for
 * iOS/iPadOS WebKit (Reynard's Gecko path stays source-owned).
 */
(() => {
  "use strict";

  const ua = navigator.userAgent || "";
  const isIOSWebKit = (
    /(?:iPhone|iPad|iPod)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) && /AppleWebKit/i.test(ua) && !/(?:FxiOS|CriOS|EdgiOS|OPiOS)/i.test(ua);

  document.documentElement.dataset.iosMediaBridgeEligible = String(isIOSWebKit);
  if (!isIOSWebKit) return;

  const sources = {
    button: "/assets/safari-media/button-DkstwzwS.mp3",
    click: "/assets/safari-media/click-C7haxnkT.mp3",
    transition: "/assets/safari-media/transition-DpDC42_v.mp3",
    paper: "/assets/safari-media/paper-Bkugm2fe.mp3",
    paperShort: "/assets/safari-media/paper-short-BvcplJlM.mp3",
    "pop-1": "/assets/safari-media/pop-1-B4vg85z0.mp3",
    "pop-2": "/assets/safari-media/pop-2-DiP7LmqZ.mp3",
    "pop-3": "/assets/safari-media/pop-3-DE83Lziy.mp3",
    "highlighter-1": "/assets/safari-media/highlighter-1-xWJiU_tz.mp3",
    "highlighter-2": "/assets/safari-media/highlighter-2-CESNcyo6.mp3",
    "highlighter-3": "/assets/safari-media/highlighter-3-C1Y9WXZR.mp3",
    pcBoot: "/assets/safari-media/pc-boot-seivfdq3.mp3",
    pinHit: "/assets/safari-media/pin-hit-BRKXb9bf.mp3",
    "penStroke-1": "/assets/safari-media/pen-stroke-1-VTa0nQ0G.mp3",
    "penStroke-2": "/assets/safari-media/pen-stroke-2-DGmJPws0.mp3",
    sike: "/assets/safari-media/sike-CPTnpV1A.mp3",
    keyboard: "/assets/safari-media/keyboard-DmciUvVR.mp3",
    eraser: "/assets/safari-media/eraser-DOZBiFCp.mp3",
    gameClick: "/assets/safari-media/game-click-CrQvsEwg.mp3",
    gameDamage: "/assets/safari-media/game-damage-CqYXMXy4.mp3",
    gameDeath: "/assets/safari-media/game-death-C76uMFwl.mp3",
    gamePickup: "/assets/safari-media/game-pickup-CUG24MFl.mp3"
  };
  const randomGroups = {
    pop: ["pop-1", "pop-2", "pop-3"],
    highlighter: ["highlighter-1", "highlighter-2", "highlighter-3"],
    penStroke: ["penStroke-1", "penStroke-2"]
  };
  const trackVolume = {
    eraser: .5, keyboard: .3, button: 1, click: 1, transition: .4,
    paper: .4, paperShort: 1, "pop-1": .5, "pop-2": .5, "pop-3": .5,
    "highlighter-1": .7, "highlighter-2": .7, "highlighter-3": .7,
    pcBoot: 1, pinHit: .7, "penStroke-1": 1, "penStroke-2": 1,
    sike: .5, gameClick: .5, gameDamage: .75, gameDeath: .8, gamePickup: .8
  };
  const masterVolume = .35;
  const root = document.createElement("div");
  root.id = "ios-media-audio-pool";
  root.setAttribute("aria-hidden", "true");
  Object.assign(root.style, {
    position: "fixed", width: "1px", height: "1px", left: "0", bottom: "0",
    overflow: "hidden", opacity: "0.001", pointerEvents: "none"
  });

  const players = new Map();
  for (const [id, src] of Object.entries(sources)) {
    const audio = document.createElement("audio");
    audio.dataset.soundId = id;
    audio.src = src;
    audio.preload = "metadata";
    audio.playsInline = true;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    audio.volume = Math.min(1, masterVolume * (trackVolume[id] ?? 1));
    audio.addEventListener("playing", () => {
      document.documentElement.dataset.iosMediaLastPlaying = id;
      document.documentElement.dataset.iosMediaBridgeState = "playing";
    });
    audio.addEventListener("error", () => {
      document.documentElement.dataset.iosMediaLastError = `${id}:${audio.error?.code || "unknown"}`;
    });
    root.appendChild(audio);
    players.set(id, audio);
  }
  document.body.appendChild(root);

  let enabled = localStorage.getItem("nodeck_sound_muted") === "false";
  let primed = false;
  let playCount = 0;

  const publish = () => {
    document.documentElement.dataset.iosMediaBridge = "active";
    document.documentElement.dataset.iosMediaBridgeEnabled = String(enabled);
    document.documentElement.dataset.iosMediaBridgePrimed = String(primed);
    document.documentElement.dataset.iosMediaPlayCount = String(playCount);
  };
  publish();

  const play = (id) => {
    if (!enabled) return Promise.resolve(false);
    const audio = players.get(id);
    if (!audio) return Promise.resolve(false);
    if (audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) audio.load();
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}
    audio.volume = Math.min(1, masterVolume * (trackVolume[id] ?? 1));
    document.documentElement.dataset.iosMediaLastAttempt = id;
    const result = audio.play();
    playCount += 1;
    publish();
    return Promise.resolve(result).then(() => {
      document.documentElement.dataset.iosMediaLastResolved = id;
      return true;
    }).catch((error) => {
      document.documentElement.dataset.iosMediaLastRejected = `${id}:${error?.name || "Error"}`;
      return false;
    });
  };

  const playRandom = (group) => {
    const ids = randomGroups[group];
    if (!ids?.length) return Promise.resolve(false);
    return play(ids[Math.floor(Math.random() * ids.length)]);
  };

  const prime = (event) => {
    if (!event.isTrusted || primed) return;
    const audio = players.get("button");
    if (!audio) return;
    const target = event.target;
    const targetWillOwnAudio = Boolean(target?.closest?.("button.btn, button.nav__arrow, .notes-button, button.btn-round"));
    if (targetWillOwnAudio) { primed = true; publish(); return; }
    audio.volume = enabled ? masterVolume : 0;
    const result = audio.play();
    Promise.resolve(result).then(() => {
      primed = true;
      window.setTimeout(() => {
        try { audio.pause(); audio.currentTime = 0; } catch {}
        audio.volume = masterVolume;
      }, 70);
      publish();
    }).catch((error) => {
      document.documentElement.dataset.iosMediaPrimeRejected = error?.name || "Error";
    });
  };

  window.addEventListener("touchend", prime, { passive: true, capture: true });
  window.addEventListener("pointerup", prime, { passive: true, capture: true });
  window.addEventListener("keydown", prime, { capture: true });

  window.addEventListener("nodeck:sound-enabled", () => {
    enabled = true;
    publish();
  });
  window.addEventListener("nodeck:sound-muted", () => {
    enabled = false;
    for (const audio of players.values()) audio.pause();
    publish();
  });
  window.addEventListener("nodeck:media-sound", (event) => {
    const { id, random } = event.detail || {};
    if (random) playRandom(random);
    else if (id) play(id);
  });

  const directSemanticCapture = (event) => {
    if (!enabled) return;
    const button = event.target.closest?.("button.btn, button.nav__arrow, .notes-button, button.btn-round");
    if (!button || button.disabled || button.id === "sound-toggle-btn" || button.dataset.sound === "off") return;
    if (button.id === "nav-prev-slide-btn" || button.id === "nav-next-slide-btn") play("transition");
    else play(button.dataset.sound || "button");
  };
  // Invoke HTML media directly in the trusted touch/pointer stack on iOS.
  document.addEventListener("touchend", directSemanticCapture, { passive: true, capture: true });
  document.addEventListener("pointerup", directSemanticCapture, { passive: true, capture: true });

  window.nodeckIOSMediaAudio = { play, playRandom, setEnabled(value) { enabled = Boolean(value); publish(); } };
})();
