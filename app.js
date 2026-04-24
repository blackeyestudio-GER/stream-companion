/**
 * Companion Overlay — eine Seite: Config + Play. Module in einer Datei (GitHub Pages).
 *
 * Sections: CompanionConfig → CompanionSpeakAudio → CompanionOverlay → CompanionAnimations → CompanionUI → boot
 */
(function () {
  'use strict';

  // ——— CompanionConfig — URL-Parameter ———
  var DEFAULTS = {
    imageUrl:
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
          '<circle cx="100" cy="110" r="70" fill="#6c9cff"/>' +
          '<circle cx="75" cy="95" r="12" fill="#1a1a2e"/>' +
          '<circle cx="125" cy="95" r="12" fill="#1a1a2e"/>' +
          '<ellipse cx="100" cy="125" rx="25" ry="12" fill="#4a6fa5"/>' +
          '<circle cx="100" cy="55" r="18" fill="#ffb86b"/>' +
        '</svg>'
      ),
    mirroring: false,
    scale: 1,
    animation: 'float',
    animationDuration: 3,
    speechText: 'Hey everyone thanks so much for hanging out with us',
    speechDuration: 4,
    speechPosition: 'bottom',
    speechOffsetX: 0,
    speechOffsetY: 0,
    fontSize: 16,
    speechFontFamily: 'Press Start 2P',
    textColor: '#1a1a2e',
    bubbleColor: '#ffffff',
    bubbleOpacity: 0.95,
    /** 0 = no min-width; width from text (still capped by max-w in CSS). */
    speechBubbleMinWidth: 300,
    autoHideSpeech: true,
    triggerIn: 'right',
    triggerOut: 'right',
    triggerDuration: 0.5,
    triggerOutDuration: 0.5,
    speakAnimation: 'wobble',
    nonspeakAnimation: 'grunt',
    speakSound: 'none',
    speakSoundUrl: '',
    /** Optional; if empty, idle image is used while speaking too. */
    imageUrlSpeak: '',
  };

  /** Fixed layout box for the image (px); visible size via scale only. */
  var IMG_LAYOUT_SIZE = 200;
  var OVERLAY_Z_INDEX = 100;

  /** Idle when nothing else is playing */
  var ANIMATION_OPTIONS = ['idle', 'float', 'bounce', 'shake', 'none', 'hidden'];
  /** Trigger in/out: slide from edges */
  var PUSH_OPTIONS = ['none', 'left', 'right', 'top', 'bottom'];
  /** While speech bubble is visible */
  var SPEAK_OPTIONS = ['none', 'shake', 'wobble', 'vibrate'];
  /** One-shot before speak (Banjo-style lead-in) */
  var NONSPEAK_OPTIONS = ['none', 'grunt', 'bob', 'squash'];
  /** During speak loop (after pre-speak): Web Audio, optional */
  var SPEAK_SOUND_OPTIONS = ['none', 'banjo', 'sims', 'wah', 'blip', 'chatter', 'custom'];
  var SPEAK_SOUND_LABELS = {
    none: 'Off',
    banjo: 'Mumble (Banjo-Kazooie style)',
    sims: 'Gibberish (Simlish-style formants)',
    wah: 'Soft "wah" (cozy life-sim vibe)',
    blip: 'Text blips (retro RPG / dialogue UI)',
    chatter: 'Fast murmur (busy NPC crowd)',
    custom: 'Custom (file or URL)',
  };

  /** Where the character enters from */
  var PUSH_IN_LABELS = {
    none: 'None',
    left: 'From left',
    right: 'From right',
    top: 'From top',
    bottom: 'From bottom',
  };
  /** Where the character exits to */
  var PUSH_OUT_LABELS = {
    none: 'None',
    left: 'To left',
    right: 'To right',
    top: 'To top',
    bottom: 'To bottom',
  };

  /**
   * Curated Google Fonts family names (same as on fonts.google.com). Loaded via fonts.googleapis.com/css2.
   * Speak tab searchable font list (each row previewed in its typeface); names must match this curated set.
   */
  var GOOGLE_SPEECH_FONTS = (
    'ABeeZee,Abel,Abril Fatface,Acme Gothic,Adamina,Advent Pro,Agdasima,Alata,Albert Sans,Aldrich,Alef,Alegreya,Alegreya Sans,Alegreya SC,Aleo,Alfa Slab One,Alice,Almarai,Amatic SC,Amiko,Antic Slab,Anton,Archivo,Archivo Black,Arimo,Armata,Arsenal,Asap,Assistant,Atkinson Hyperlegible,Bangers,Barlow,Barlow Condensed,Bebas Neue,Bitter,Bree Serif,Bungee,Cabin,Cairo,Catamaran,Caveat,Chakra Petch,Cinzel,Comfortaa,Commissioner,Cormorant Garamond,Crete Round,Crimson Text,Cuprum,Dancing Script,DM Sans,DM Serif Display,Domine,Dosis,DynaPuff,EB Garamond,Economica,Exo 2,Fira Code,Fira Sans,Fjalla One,Fredoka,Gabriela,Geologica,Great Vibes,Heebo,Hind,IBM Plex Mono,IBM Plex Sans,IBM Plex Serif,Inconsolata,Inter,Josefin Sans,Josefin Slab,Kanit,Karla,Labrada,Lato,Lexend,Libre Baskerville,Libre Franklin,Lilita One,Lobster,Lora,Manrope,Merriweather,Montserrat,Montserrat Alternates,Mulish,Murecho,MuseoModerno,Newsreader,Noto Sans,Noto Serif,Nunito,Nunito Sans,Open Sans,Orbitron,Oswald,Outfit,Oxygen,Pacifico,Patua One,Permanent Marker,Pinyon Script,Playfair Display,Plus Jakarta Sans,Poppins,Press Start 2P,PT Sans,PT Serif,Quicksand,Rajdhani,Raleway,Righteous,Roboto,Roboto Condensed,Roboto Mono,Roboto Slab,Rubik,Satisfy,Shadows Into Light,Signika,Silkscreen,Slabo 27px,Source Code Pro,Source Sans 3,Source Serif 4,Space Grotesk,Staatliches,Teko,Tinos,Titillium Web,Ubuntu,Ubuntu Mono,Varela Round,Work Sans,Yanone Kaffeesatz,Zilla Slab'
  ).split(',');

  var loadedGoogleFonts = {};

  function sanitizeSpeechFontFamily(raw) {
    var t = String(raw == null ? '' : raw).trim();
    if (!t) return DEFAULTS.speechFontFamily;
    if (t.length > 96) t = t.slice(0, 96);
    t = t.replace(/[<>"'`;{}\\]/g, '');
    t = t.trim();
    return t || DEFAULTS.speechFontFamily;
  }

  function clampSpeechFontFamilyToList(raw) {
    var t = sanitizeSpeechFontFamily(raw);
    return GOOGLE_SPEECH_FONTS.indexOf(t) >= 0 ? t : DEFAULTS.speechFontFamily;
  }

  function ensureGoogleFontLoaded(family) {
    var name = sanitizeSpeechFontFamily(family);
    if (!name || loadedGoogleFonts[name]) return;
    var safeId =
      'gf-' +
      name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .replace(/-+/g, '-')
        .slice(0, 72);
    if (!safeId || safeId === 'gf-') safeId = 'gf-custom-' + String(name.length) + '-' + String(name.charCodeAt(0) || 0);
    if (document.getElementById(safeId)) {
      loadedGoogleFonts[name] = 1;
      return;
    }
    var link = document.createElement('link');
    link.id = safeId;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=' +
      encodeURIComponent(name).replace(/%20/g, '+') +
      ':wght@400;600;700&display=swap';
    document.head.appendChild(link);
    loadedGoogleFonts[name] = 1;
  }

  function parseBool(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    var s = String(v).toLowerCase();
    if (s === '1' || s === 'true' || s === 'yes') return true;
    if (s === '0' || s === 'false' || s === 'no') return false;
    return fallback;
  }

  function parseNum(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    var n = parseFloat(String(v), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  /** px; clamp for URL / form safety */
  function clampSpeechOffset(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(-500, Math.min(500, n));
  }

  /** px; 0 allowed (means off / auto) */
  function clampSpeechBubbleSizePx(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1200, Math.round(n)));
  }

  function parseInt10(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    var n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function clampAnimation(name) {
    return ANIMATION_OPTIONS.indexOf(name) >= 0 ? name : DEFAULTS.animation;
  }

  function clampPosition(pos) {
    var ok = ['top', 'bottom', 'left', 'right', 'subtitle'];
    return ok.indexOf(pos) >= 0 ? pos : DEFAULTS.speechPosition;
  }

  function clampPush(raw, fallback) {
    var name = raw != null && String(raw) !== '' ? String(raw) : fallback;
    return PUSH_OPTIONS.indexOf(name) >= 0 ? name : fallback;
  }

  function clampSpeak(name) {
    return SPEAK_OPTIONS.indexOf(name) >= 0 ? name : DEFAULTS.speakAnimation;
  }

  function clampNonspeak(name) {
    return NONSPEAK_OPTIONS.indexOf(name) >= 0 ? name : DEFAULTS.nonspeakAnimation;
  }

  function clampSpeakSound(name) {
    var n = name != null ? String(name) : '';
    if (n === 'radio') n = 'sims';
    if (n === 'pulse') n = 'blip';
    return SPEAK_SOUND_OPTIONS.indexOf(n) >= 0 ? n : DEFAULTS.speakSound;
  }

  function parseParams(params) {
    function get(key) {
      return params.get(key);
    }
    var triggerDurParsed = parseNum(get('triggerDuration'), DEFAULTS.triggerDuration);
    var triggerOutRaw = get('triggerOutDuration');
    var triggerOutDurParsed =
      triggerOutRaw != null && String(triggerOutRaw) !== ''
        ? parseNum(triggerOutRaw, DEFAULTS.triggerOutDuration)
        : triggerDurParsed;
    return {
      imageUrl: get('imageUrl') != null && get('imageUrl') !== '' ? get('imageUrl') : DEFAULTS.imageUrl,
      imageUrlSpeak:
        get('imageUrlSpeak') != null && String(get('imageUrlSpeak')) !== ''
          ? String(get('imageUrlSpeak'))
          : DEFAULTS.imageUrlSpeak,
      mirroring: parseBool(get('mirroring'), DEFAULTS.mirroring),
      scale: parseNum(get('scale'), DEFAULTS.scale),
      animation: clampAnimation(get('animation') || DEFAULTS.animation),
      animationDuration: parseNum(get('animationDuration'), DEFAULTS.animationDuration),
      speechText: get('speechText') != null ? get('speechText') : DEFAULTS.speechText,
      speechDuration: parseNum(get('speechDuration'), DEFAULTS.speechDuration),
      speechPosition: clampPosition(get('speechPosition') || DEFAULTS.speechPosition),
      speechOffsetX: clampSpeechOffset(parseNum(get('speechOffsetX'), DEFAULTS.speechOffsetX)),
      speechOffsetY: clampSpeechOffset(parseNum(get('speechOffsetY'), DEFAULTS.speechOffsetY)),
      fontSize: parseInt10(get('fontSize'), DEFAULTS.fontSize),
      speechFontFamily: clampSpeechFontFamilyToList(get('speechFontFamily')),
      textColor: get('textColor') != null && get('textColor') !== '' ? get('textColor') : DEFAULTS.textColor,
      bubbleColor: get('bubbleColor') != null && get('bubbleColor') !== '' ? get('bubbleColor') : DEFAULTS.bubbleColor,
      bubbleOpacity: parseNum(get('bubbleOpacity'), DEFAULTS.bubbleOpacity),
      speechBubbleMinWidth: clampSpeechBubbleSizePx(
        parseInt10(get('speechBubbleMinWidth'), DEFAULTS.speechBubbleMinWidth)
      ),
      autoHideSpeech: parseBool(get('autoHideSpeech'), DEFAULTS.autoHideSpeech),
      triggerIn: clampPush(get('triggerIn'), DEFAULTS.triggerIn),
      triggerOut: clampPush(get('triggerOut'), DEFAULTS.triggerOut),
      triggerDuration: triggerDurParsed,
      triggerOutDuration: triggerOutDurParsed,
      speakAnimation: clampSpeak(get('speakAnimation') || DEFAULTS.speakAnimation),
      nonspeakAnimation: clampNonspeak(get('nonspeakAnimation') || DEFAULTS.nonspeakAnimation),
      speakSound: clampSpeakSound(get('speakSound') || DEFAULTS.speakSound),
      speakSoundUrl:
        get('speakSoundUrl') != null && String(get('speakSoundUrl')) !== ''
          ? String(get('speakSoundUrl'))
          : DEFAULTS.speakSoundUrl,
    };
  }

  /** Decode the value after `#say=` in a hash string. Returns `null` if the fragment is not `#say=…`. */
  function decodeSayFragmentValue(hash) {
    if (!hash || hash.indexOf('#say=') !== 0) return null;
    var raw = hash.slice(5);
    if (raw === '') return '';
    try {
      return decodeURIComponent(raw.replace(/\+/g, ' '));
    } catch (e) {
      return raw.replace(/\+/g, ' ');
    }
  }

  /** Speech text from the current page hash (`#say=…` only). Generated URLs put speech here, not in the query. */
  function parseSpeechTextFromHash() {
    return decodeSayFragmentValue(window.location.hash);
  }

  function mergeSpeechFromHash(parsed) {
    var fromHash = parseSpeechTextFromHash();
    if (fromHash === null) return parsed;
    var out = {};
    for (var k in parsed) {
      if (Object.prototype.hasOwnProperty.call(parsed, k)) out[k] = parsed[k];
    }
    out.speechText = String(fromHash);
    return out;
  }

  function speechTextHashFragment(settings) {
    return '#say=' + encodeURIComponent(String(settings.speechText != null ? settings.speechText : ''));
  }

  function parseFromLocation() {
    var parsed = parseParams(new URLSearchParams(window.location.search));
    return mergeSpeechFromHash(parsed);
  }

  function serialize(settings, forPlay) {
    if (forPlay === undefined) forPlay = true;
    var p = new URLSearchParams();
    if (forPlay) p.set('play', '1');
    p.set('imageUrl', String(settings.imageUrl));
    p.set('imageUrlSpeak', String(settings.imageUrlSpeak != null ? settings.imageUrlSpeak : ''));
    p.set('mirroring', settings.mirroring ? '1' : '0');
    p.set('scale', String(settings.scale));
    p.set('animation', String(settings.animation));
    p.set('animationDuration', String(settings.animationDuration));
    p.set('speechDuration', String(settings.speechDuration));
    p.set('speechPosition', String(settings.speechPosition));
    p.set('speechOffsetX', String(clampSpeechOffset(Number(settings.speechOffsetX))));
    p.set('speechOffsetY', String(clampSpeechOffset(Number(settings.speechOffsetY))));
    p.set('fontSize', String(Math.round(settings.fontSize)));
    p.set('speechFontFamily', String(clampSpeechFontFamilyToList(settings.speechFontFamily)));
    p.set('textColor', String(settings.textColor));
    p.set('bubbleColor', String(settings.bubbleColor));
    p.set('bubbleOpacity', String(settings.bubbleOpacity));
    p.set('speechBubbleMinWidth', String(clampSpeechBubbleSizePx(Number(settings.speechBubbleMinWidth))));
    p.set('autoHideSpeech', settings.autoHideSpeech ? '1' : '0');
    p.set('triggerIn', String(settings.triggerIn));
    p.set('triggerOut', String(settings.triggerOut));
    p.set('triggerDuration', String(settings.triggerDuration));
    p.set('triggerOutDuration', String(settings.triggerOutDuration));
    p.set('speakAnimation', String(settings.speakAnimation));
    p.set('nonspeakAnimation', String(settings.nonspeakAnimation));
    p.set('speakSound', String(settings.speakSound));
    p.set('speakSoundUrl', String(settings.speakSoundUrl != null ? settings.speakSoundUrl : ''));
    return p.toString();
  }

  function buildPlayUrl(settings) {
    var q = serialize(settings, true);
    var origin = window.location.origin;
    var pathname = window.location.pathname;

    // Use full file URL if not running on blackeyestudio.de
    var isBlackeye = window.location.hostname.indexOf('blackeyestudio.de') !== -1;
    if (!isBlackeye) {
      if (window.location.protocol === 'file:') {
        return (
          window.location.href.split('?')[0].split('#')[0] +
          (q ? '?' + q : '') +
          speechTextHashFragment(settings)
        );
      }
      
      var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.indexOf('localhost') !== -1;
      if (isLocalhost) {
        // If on localhost (IDE dev server), we can't easily get the disk path.
        // We return a relative URL starting with "./" so the user can see it's
        // meant to be local, and OBS might resolve it if they save the file.
        // This also removes the "localhost:63342" part they complained about.
        return './' + (pathname.split('/').pop() || 'index.html') + (q ? '?' + q : '') + speechTextHashFragment(settings);
      }
    }

    var base = (origin === 'null' ? '' : origin) + pathname;
    return base + (q ? '?' + q : '') + speechTextHashFragment(settings);
  }

  /**
   * Query string for the config editor URL (no play=1). Used with history.replaceState.
   * Drops inline/huge imageUrl, imageUrlSpeak, and speakSoundUrl so the address bar stays within practical limits;
   * use Share → copy OBS link or Save TXT for full embedded assets.
   */
  function buildConfigEditorQuery(settings) {
    var p = new URLSearchParams(serialize(settings, false));
    var iu = p.get('imageUrl');
    if (iu && (/^(data:|blob:)/i.test(iu) || iu.length > 3000)) p.delete('imageUrl');
    var su = p.get('speakSoundUrl');
    if (su && (/^(data:|blob:)/i.test(su) || su.length > 3000)) p.delete('speakSoundUrl');
    var iSpeak = p.get('imageUrlSpeak');
    if (iSpeak && (/^(data:|blob:)/i.test(iSpeak) || iSpeak.length > 3000)) p.delete('imageUrlSpeak');
    return p.toString();
  }

  function parseConfigText(text) {
    var trimmed = String(text).trim();
    if (!trimmed) return null;
    try {
      if (trimmed.indexOf('http://') === 0 || trimmed.indexOf('https://') === 0 || trimmed.indexOf('file://') === 0) {
        var u = new URL(trimmed);
        var sp = u.searchParams;
        var fromSay = decodeSayFragmentValue(u.hash);
        if (fromSay !== null) sp.set('speechText', fromSay);
        return sp;
      }
      var q = trimmed.indexOf('?') >= 0 ? trimmed.slice(trimmed.indexOf('?') + 1) : trimmed;
      return new URLSearchParams(q);
    } catch (e) {
      return null;
    }
  }

  /**
   * Image source for &lt;img src&gt;:
   * — Hosted: full https URL (or http / data / blob).
   * — Local (OBS, file://): file URL, Windows path (C:\…), Unix path, or relative to the HTML file.
   * @param {string} raw — imageUrl from URL params or form
   * @returns {string}
   */
  function resolveImageSrc(raw) {
    var t = String(raw == null ? '' : raw).trim();
    if (!t) return DEFAULTS.imageUrl;
    var low = t.toLowerCase();
    if (/^https?:\/\//i.test(t)) return t;
    if (low.indexOf('data:') === 0 || low.indexOf('blob:') === 0) return t;
    if (low.indexOf('file://') === 0) return t;
    if (t.indexOf('//') === 0 && t.substring(0, 3) !== '///') {
      return window.location.protocol + t;
    }
    // Windows: C:\… oder C:/… → file:///C:/…
    if (/^[A-Za-z]:[/\\]/.test(t)) {
      return 'file:///' + t.replace(/\\/g, '/');
    }
    try {
      return new URL(t, window.location.href).href;
    } catch (e) {
      return t;
    }
  }

  var CompanionConfig = {
    DEFAULTS: DEFAULTS,
    ANIMATION_OPTIONS: ANIMATION_OPTIONS,
    PUSH_OPTIONS: PUSH_OPTIONS,
    SPEAK_OPTIONS: SPEAK_OPTIONS,
    NONSPEAK_OPTIONS: NONSPEAK_OPTIONS,
    SPEAK_SOUND_OPTIONS: SPEAK_SOUND_OPTIONS,
    SPEAK_SOUND_LABELS: SPEAK_SOUND_LABELS,
    PUSH_IN_LABELS: PUSH_IN_LABELS,
    PUSH_OUT_LABELS: PUSH_OUT_LABELS,
    parseParams: parseParams,
    parseFromLocation: parseFromLocation,
    parseSpeechTextFromHash: parseSpeechTextFromHash,
    serialize: serialize,
    buildPlayUrl: buildPlayUrl,
    buildConfigEditorQuery: buildConfigEditorQuery,
    parseConfigText: parseConfigText,
    resolveImageSrc: resolveImageSrc,
    /** Same URL rules as images (https, data, blob, file, relative paths). */
    resolveSpeakSoundUrl: resolveImageSrc,
    GOOGLE_SPEECH_FONTS: GOOGLE_SPEECH_FONTS,
  };

  // ——— CompanionSpeakAudio — Web Audio, starts with the speak loop (after pre-speak) ———
  var CompanionSpeakAudio = (function () {
    var ctx = null;
    var active = false;
    var mode = 'none';
    var banjoNextId = 0;
    var wahNextId = 0;
    var chatterNextId = 0;
    var blipNextId = 0;
    var simsNextId = 0;
    var customAudioEl = null;

    function ensureCtx() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      return ctx;
    }

    function stopCustomAudio() {
      if (!customAudioEl) return;
      try {
        customAudioEl.pause();
        customAudioEl.removeAttribute('src');
        customAudioEl.load();
      } catch (e) {}
      customAudioEl = null;
    }

    function stop() {
      active = false;
      mode = 'none';
      stopCustomAudio();
      if (banjoNextId) {
        clearTimeout(banjoNextId);
        banjoNextId = 0;
      }
      if (wahNextId) {
        clearTimeout(wahNextId);
        wahNextId = 0;
      }
      if (chatterNextId) {
        clearTimeout(chatterNextId);
        chatterNextId = 0;
      }
      if (blipNextId) {
        clearTimeout(blipNextId);
        blipNextId = 0;
      }
      if (simsNextId) {
        clearTimeout(simsNextId);
        simsNextId = 0;
      }
    }

    function scheduleBanjoGrunt(c) {
      if (!active || mode !== 'banjo') return;
      var t = c.currentTime;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'triangle';
      var f0 = 130 + Math.random() * 300;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(65, 55 + Math.random() * 100), t + 0.04 + Math.random() * 0.05);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.07, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.065 + Math.random() * 0.055);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.15);
      var delay = 48 + Math.random() * 170;
      if (banjoNextId) clearTimeout(banjoNextId);
      banjoNextId = window.setTimeout(function () {
        banjoNextId = 0;
        scheduleBanjoGrunt(c);
      }, delay);
    }

    /**
     * Discrete “syllables” — voiced tones + formants + occasional fricative noise.
     * Avoids continuous filtered noise (which reads as radio static).
     */
    function scheduleSimsSyllable(c) {
      if (!active || mode !== 'sims') return;
      var t = c.currentTime;
      var dur = 0.05 + Math.random() * 0.09;
      var fricative = Math.random() < 0.22;

      if (fricative) {
        dur = 0.028 + Math.random() * 0.04;
        var nLen = Math.max(64, Math.floor(c.sampleRate * dur));
        var nBuf = c.createBuffer(1, nLen, c.sampleRate);
        var nd = nBuf.getChannelData(0);
        for (var i = 0; i < nLen; i++) {
          var w = Math.sin((i / (nLen - 1 || 1)) * Math.PI);
          nd[i] = (Math.random() * 2 - 1) * w;
        }
        var nSrc = c.createBufferSource();
        nSrc.buffer = nBuf;
        var nBp = c.createBiquadFilter();
        nBp.type = 'bandpass';
        nBp.frequency.value = 1400 + Math.random() * 3200;
        nBp.Q.value = 3 + Math.random() * 4;
        var nG = c.createGain();
        nG.gain.setValueAtTime(0, t);
        nG.gain.linearRampToValueAtTime(0.07 + Math.random() * 0.05, t + 0.004);
        nG.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        nSrc.connect(nBp);
        nBp.connect(nG);
        nG.connect(c.destination);
        nSrc.start(t);
        nSrc.stop(t + dur + 0.01);
      } else {
        var f0 = 165 + Math.random() * 280;
        var o = c.createOscillator();
        o.type = Math.random() > 0.4 ? 'triangle' : 'sawtooth';
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(95, f0 * (0.68 + Math.random() * 0.38)), t + dur);

        var peak = c.createBiquadFilter();
        peak.type = 'peaking';
        peak.frequency.value = 650 + Math.random() * 2200;
        peak.Q.value = 0.55 + Math.random() * 2.2;
        peak.gain.value = 4 + Math.random() * 12;

        var lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400 + Math.random() * 3200;
        lp.Q.value = 0.4;

        var g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.068 + Math.random() * 0.042, t + 0.012 + Math.random() * 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);

        o.connect(peak);
        peak.connect(lp);
        lp.connect(g);
        g.connect(c.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
      }

      var gap = 38 + Math.random() * 165;
      if (simsNextId) clearTimeout(simsNextId);
      simsNextId = window.setTimeout(function () {
        simsNextId = 0;
        scheduleSimsSyllable(c);
      }, gap);
    }

    /** Soft falling sine “wah” — cozy life-sim / mascot vibe. */
    function scheduleWah(c) {
      if (!active || mode !== 'wah') return;
      var t = c.currentTime;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sine';
      var fHi = 220 + Math.random() * 160;
      o.frequency.setValueAtTime(fHi, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(90, 95 + Math.random() * 70), t + 0.1 + Math.random() * 0.06);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.065 + Math.random() * 0.035, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.14 + Math.random() * 0.06);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.22);
      var delay = 200 + Math.random() * 220;
      if (wahNextId) clearTimeout(wahNextId);
      wahNextId = window.setTimeout(function () {
        wahNextId = 0;
        scheduleWah(c);
      }, delay);
    }

    /** Fast RPG-style text ticks — short, bright, varied pitch (not a slow monotone beep). */
    function scheduleBlip(c) {
      if (!active || mode !== 'blip') return;
      var t = c.currentTime;
      var o = c.createOscillator();
      o.type = Math.random() > 0.55 ? 'square' : 'triangle';
      var steps = [784, 880, 988, 1046, 1175, 1318, 1480, 1568];
      var f = steps[Math.floor(Math.random() * steps.length)];
      if (Math.random() > 0.65) f = f * (Math.random() > 0.5 ? 0.5 : 2);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (0.92 + Math.random() * 0.1), t + 0.008);

      var hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 380;
      hp.Q.value = 0.5;

      var g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.06, t + 0.0008);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.011 + Math.random() * 0.009);

      o.connect(hp);
      hp.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.022);

      var delay = 28 + Math.random() * 58;
      if (blipNextId) clearTimeout(blipNextId);
      blipNextId = window.setTimeout(function () {
        blipNextId = 0;
        scheduleBlip(c);
      }, delay);
    }

    /** Quieter, faster syllables — busy crowd / auctioneer feel. */
    function scheduleChatter(c) {
      if (!active || mode !== 'chatter') return;
      var t = c.currentTime;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = Math.random() > 0.45 ? 'triangle' : 'sawtooth';
      var f0 = 180 + Math.random() * 260;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(70, 60 + Math.random() * 90), t + 0.028 + Math.random() * 0.03);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045 + Math.random() * 0.03, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.045 + Math.random() * 0.035);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.095);
      var delay = 28 + Math.random() * 65;
      if (chatterNextId) clearTimeout(chatterNextId);
      chatterNextId = window.setTimeout(function () {
        chatterNextId = 0;
        scheduleChatter(c);
      }, delay);
    }

    function start(modeName, opts) {
      stop();
      if (!modeName || modeName === 'none') return;
      if (modeName === 'custom') {
        var urlRaw = opts && opts.speakSoundUrl != null ? String(opts.speakSoundUrl) : '';
        if (!urlRaw.trim()) return;
        var src = CompanionConfig.resolveSpeakSoundUrl(urlRaw);
        if (!src) return;
        active = true;
        mode = 'custom';
        customAudioEl = new Audio();
        customAudioEl.crossOrigin = 'anonymous';
        customAudioEl.loop = true;
        customAudioEl.volume = 0.88;
        customAudioEl.src = src;
        customAudioEl.play().catch(function () {});
        return;
      }
      var c = ensureCtx();
      if (!c) return;
      active = true;
      mode = modeName;
      if (modeName === 'banjo') scheduleBanjoGrunt(c);
      else if (modeName === 'sims') scheduleSimsSyllable(c);
      else if (modeName === 'wah') scheduleWah(c);
      else if (modeName === 'blip') scheduleBlip(c);
      else if (modeName === 'chatter') scheduleChatter(c);
    }

    return { start: start, stop: stop };
  })();

  // ——— CompanionOverlay ———
  var IDLE_ANIM_CLASSES = [
    'animate-cmp-idle',
    'animate-cmp-float',
    'animate-cmp-bounce',
    'animate-cmp-shake',
    'animate-none',
  ];
  var ALL_PUSH_CLASSES = [
    'animate-push-in-left',
    'animate-push-in-right',
    'animate-push-in-top',
    'animate-push-in-bottom',
    'animate-push-out-left',
    'animate-push-out-right',
    'animate-push-out-top',
    'animate-push-out-bottom',
  ];
  var SPEAK_ANIM_CLASSES = ['animate-speak-shake', 'animate-speak-wobble', 'animate-speak-vibrate'];
  var NONSPEAK_ANIM_CLASSES = ['animate-nonspeak-grunt', 'animate-nonspeak-bob', 'animate-nonspeak-squash'];

  var IDLE_CLASS_MAP = {
    idle: 'animate-cmp-idle',
    float: 'animate-cmp-float',
    bounce: 'animate-cmp-bounce',
    shake: 'animate-cmp-shake',
    none: 'animate-none',
  };

  function stripIdleClasses(img) {
    IDLE_ANIM_CLASSES.forEach(function (c) {
      img.classList.remove(c);
    });
  }

  function getPushLayer(root) {
    return root ? root.querySelector('.companion-push-layer') : null;
  }

  function clearPushLayer(root) {
    var layer = getPushLayer(root);
    if (!layer) return;
    ALL_PUSH_CLASSES.forEach(function (c) {
      layer.classList.remove(c);
    });
    layer.style.transform = '';
  }

  function getCompanionVisual(root) {
    return root ? root.querySelector('.companion-visual') : null;
  }

  /** Remove hidden-idle offstage so avatar can be seen (push-in, speech, settings preview). */
  function revealCompanionVisual(root) {
    var visual = getCompanionVisual(root);
    if (visual) visual.classList.remove('cmp-idle-offstage');
  }

  /** Trigger in: slide in from one edge */
  function playPushIn(root, settings, onDone) {
    var layer = getPushLayer(root);
    if (!layer || !settings.triggerIn || settings.triggerIn === 'none') {
      if (onDone) onDone();
      return;
    }
    revealCompanionVisual(root);
    clearPushLayer(root);
    layer.style.setProperty('--trigger-duration', String(settings.triggerDuration) + 's');
    var cls = 'animate-push-in-' + settings.triggerIn;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      layer.classList.remove(cls);
      layer.removeEventListener('animationend', onEnd);
      if (onDone) onDone();
    }
    function onEnd(ev) {
      if (ev.target !== layer) return;
      finish();
    }
    layer.addEventListener('animationend', onEnd);
    layer.classList.add(cls);
    window.setTimeout(finish, Math.max(250, settings.triggerDuration * 1000) + 120);
  }

  /** Trigger out: slide off-screen */
  function playPushOut(root, settings, onDone) {
    var layer = getPushLayer(root);
    if (!layer || !settings.triggerOut || settings.triggerOut === 'none') {
      if (onDone) onDone();
      return;
    }
    clearPushLayer(root);
    var outDur = settings.triggerOutDuration != null ? settings.triggerOutDuration : settings.triggerDuration;
    layer.style.setProperty('--trigger-duration', String(outDur) + 's');
    var cls = 'animate-push-out-' + settings.triggerOut;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      layer.classList.remove(cls);
      layer.removeEventListener('animationend', onEnd);
      if (onDone) onDone();
    }
    function onEnd(ev) {
      if (ev.target !== layer) return;
      finish();
    }
    layer.addEventListener('animationend', onEnd);
    layer.classList.add(cls);
    window.setTimeout(finish, Math.max(250, outDur * 1000) + 120);
  }

  function clearSpeakAnim(root) {
    var img = root.querySelector('.companion-image');
    if (!img) return;
    SPEAK_ANIM_CLASSES.concat(NONSPEAK_ANIM_CLASSES).forEach(function (c) {
      img.classList.remove(c);
    });
  }

  /** Looping animation while speech bubble is visible */
  function setSpeakAnim(root, name) {
    var img = root.querySelector('.companion-image');
    if (!img) return;
    SPEAK_ANIM_CLASSES.forEach(function (c) {
      img.classList.remove(c);
    });
    stripIdleClasses(img);
    if (!name || name === 'none') return;
    var map = { shake: 'animate-speak-shake', wobble: 'animate-speak-wobble', vibrate: 'animate-speak-vibrate' };
    if (map[name]) img.classList.add(map[name]);
  }

  /** Short one-shot before speak */
  function playNonspeak(root, name, onDone) {
    var img = root.querySelector('.companion-image');
    if (!img || !name || name === 'none') {
      if (onDone) onDone();
      return;
    }
    NONSPEAK_ANIM_CLASSES.forEach(function (c) {
      img.classList.remove(c);
    });
    stripIdleClasses(img);
    var map = { grunt: 'animate-nonspeak-grunt', bob: 'animate-nonspeak-bob', squash: 'animate-nonspeak-squash' };
    var cls = map[name];
    if (!cls) {
      if (onDone) onDone();
      return;
    }
    img.classList.add(cls);
    window.setTimeout(function () {
      img.classList.remove(cls);
      if (onDone) onDone();
    }, 420);
  }

  function restoreIdleAfterSpeak(root, idleName) {
    clearSpeakAnim(root);
    setIdleAnimation(root, idleName);
  }

  /** Resolved URL string before resolveImageSrc. If mode is speak but no speak asset, always idle. */
  function pickExpressionImageRaw(settings, mode) {
    var idle =
      settings.imageUrl != null && String(settings.imageUrl).trim() !== ''
        ? String(settings.imageUrl).trim()
        : DEFAULTS.imageUrl;
    var speak =
      settings.imageUrlSpeak != null && String(settings.imageUrlSpeak).trim() !== ''
        ? String(settings.imageUrlSpeak).trim()
        : '';
    if (mode === 'speak' && speak) return speak;
    return idle;
  }

  function hasSpeakImageAsset(settings) {
    return settings.imageUrlSpeak != null && String(settings.imageUrlSpeak).trim() !== '';
  }

  /** Switch between idle and speak asset during speech; without speak asset, stays idle (same as imageUrl). */
  function setCompanionImageMode(root, settings, mode) {
    var img = root.querySelector('.companion-image');
    if (!img) return;
    var eff =
      mode === 'speak' && !hasSpeakImageAsset(settings) ? 'idle' : mode;
    if (root.getAttribute('data-expression') === eff) return;
    root.setAttribute('data-expression', eff);
    img.src = CompanionConfig.resolveImageSrc(pickExpressionImageRaw(settings, mode));
  }

  function applySettings(root, settings) {
    if (!root) return;

    root.style.zIndex = String(OVERLAY_Z_INDEX);
    var g = Math.max(4, 6 * settings.scale);
    root.style.setProperty('--speech-gap', g + 'px');
    root.style.setProperty('--speech-gap-subtitle', Math.max(5, Math.round(g * 1.35)) + 'px');

    var stage = root.querySelector('.companion-stage');
    if (stage) {
      stage.style.setProperty('--anim-duration', String(settings.animationDuration) + 's');
    }
    var pushLayer = getPushLayer(root);
    if (pushLayer) {
      pushLayer.style.setProperty('--trigger-duration', String(settings.triggerDuration) + 's');
    }

    var visual = root.querySelector('.companion-visual');
    var img = root.querySelector('.companion-image');
    var bubble = root.querySelector('.speech-bubble');

    if (visual) {
      visual.style.transform =
        (settings.mirroring ? 'scaleX(-1) ' : '') + 'scale(' + settings.scale + ')';
      visual.style.transformOrigin = 'center center';
    }

    if (img) {
      root.removeAttribute('data-expression');
      var idleSrc =
        settings.imageUrl != null && String(settings.imageUrl).trim() !== ''
          ? String(settings.imageUrl).trim()
          : DEFAULTS.imageUrl;
      img.src = CompanionConfig.resolveImageSrc(idleSrc);
      img.alt = 'Companion';
      img.width = IMG_LAYOUT_SIZE;
      img.height = IMG_LAYOUT_SIZE;
      img.style.width = IMG_LAYOUT_SIZE + 'px';
      img.style.height = IMG_LAYOUT_SIZE + 'px';
      root.setAttribute('data-expression', 'idle');
    }

    var bubbleWrap = root.querySelector('.speech-bubble-wrap');
    if (bubbleWrap) {
      var ox = clampSpeechOffset(Number(settings.speechOffsetX));
      var oy = clampSpeechOffset(Number(settings.speechOffsetY));
      bubbleWrap.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
    }

    if (bubble) {
      bubble.textContent = settings.speechText;
      bubble.setAttribute('data-position', settings.speechPosition);
      var ff = clampSpeechFontFamilyToList(
        settings.speechFontFamily != null ? settings.speechFontFamily : DEFAULTS.speechFontFamily
      );
      ensureGoogleFontLoaded(ff);
      bubble.style.fontFamily = '"' + ff.replace(/"/g, '') + '", ui-sans-serif, system-ui, sans-serif';
      bubble.style.fontSize = settings.fontSize + 'px';
      bubble.style.color = settings.textColor;
      bubble.style.backgroundColor = settings.bubbleColor;
      bubble.style.setProperty('--bubble-opacity-visual', String(settings.bubbleOpacity));
      bubble.style.width = '';
      var bmin = clampSpeechBubbleSizePx(Number(settings.speechBubbleMinWidth));
      bubble.style.minWidth = bmin > 0 ? bmin + 'px' : '';
    }

    var play = root.getAttribute('data-play-mode') === '1';
    if (play) {
      document.documentElement.classList.add('bg-transparent');
      document.body.classList.add('bg-transparent');
    }
  }

  function setSpeechVisible(root, visible) {
    if (!root) return;
    var bubble = root.querySelector('.speech-bubble');
    if (!bubble) return;
    var o = bubble.style.getPropertyValue('--bubble-opacity-visual').trim() || '1';
    if (visible) {
      bubble.classList.remove('invisible');
      bubble.style.opacity = o;
      bubble.style.visibility = 'visible';
    } else {
      bubble.classList.add('invisible');
      bubble.style.opacity = '0';
      bubble.style.visibility = 'hidden';
    }
    bubble.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function setIdleAnimation(root, animationName) {
    if (!root) return;
    var img = root.querySelector('.companion-image');
    if (!img) return;
    var visual = getCompanionVisual(root);
    stripIdleClasses(img);
    SPEAK_ANIM_CLASSES.concat(NONSPEAK_ANIM_CLASSES).forEach(function (c) {
      img.classList.remove(c);
    });
    if (visual) visual.classList.remove('cmp-idle-offstage');
    if (animationName === 'hidden') {
      img.classList.add(IDLE_CLASS_MAP.none);
      if (visual) visual.classList.add('cmp-idle-offstage');
      return;
    }
    var cls = IDLE_CLASS_MAP[animationName] || IDLE_CLASS_MAP.float;
    img.classList.add(cls);
  }

  var CompanionOverlay = {
    applySettings: applySettings,
    setSpeechVisible: setSpeechVisible,
    setIdleAnimation: setIdleAnimation,
    revealCompanionVisual: revealCompanionVisual,
    clearPushLayer: clearPushLayer,
    playPushIn: playPushIn,
    playPushOut: playPushOut,
    clearSpeakAnim: clearSpeakAnim,
    setSpeakAnim: setSpeakAnim,
    playNonspeak: playNonspeak,
    restoreIdleAfterSpeak: restoreIdleAfterSpeak,
    setCompanionImageMode: setCompanionImageMode,
    hasSpeakImageAsset: hasSpeakImageAsset,
  };

  // ——— CompanionAnimations ———
  function createController(options) {
    var root = options.root;
    var getSettings =
      typeof options.getSettings === 'function'
        ? options.getSettings
        : function () {
            return options.settings;
          };
    var onTick = options.onTick;

    var rafId = 0;
    var speechHideTimer = 0;
    var speechVisible = false;
    /** False after trigger-out until trigger-in / bootstrap again */
    var characterOnStage = false;

    function state() {
      return {
        now: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        speechVisible: speechVisible,
        characterOnStage: characterOnStage,
      };
    }

    function tick() {
      var s = state();
      if (onTick) onTick(s);
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      stop();
      rafId = requestAnimationFrame(tick);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (speechHideTimer) clearTimeout(speechHideTimer);
      speechHideTimer = 0;
      CompanionSpeakAudio.stop();
    }

    function syncIdleFromSettings() {
      CompanionOverlay.setIdleAnimation(root, getSettings().animation);
    }

    /** Speech bubble + pre-speak + speak loop (no trigger-in) */
    function internalShowSpeechBody() {
      var st = getSettings();
      CompanionOverlay.revealCompanionVisual(root);
      speechVisible = true;
      CompanionOverlay.setSpeechVisible(root, true);
      CompanionOverlay.clearSpeakAnim(root);
      function startSpeakLoop() {
        CompanionOverlay.setCompanionImageMode(root, st, 'speak');
        CompanionOverlay.setSpeakAnim(root, st.speakAnimation);
        CompanionSpeakAudio.start(st.speakSound, { speakSoundUrl: st.speakSoundUrl });
      }
      if (st.nonspeakAnimation && st.nonspeakAnimation !== 'none') {
        CompanionOverlay.playNonspeak(root, st.nonspeakAnimation, startSpeakLoop);
      } else {
        startSpeakLoop();
      }
      if (speechHideTimer) clearTimeout(speechHideTimer);
      if (st.autoHideSpeech && st.speechDuration > 0) {
        speechHideTimer = window.setTimeout(hideSpeech, st.speechDuration * 1000);
      }
    }

    function showSpeech() {
      var st = getSettings();
      if (speechHideTimer) clearTimeout(speechHideTimer);
      if (!characterOnStage && st.triggerIn !== 'none') {
        CompanionOverlay.playPushIn(root, st, function () {
          characterOnStage = true;
          internalShowSpeechBody();
        });
      } else {
        if (!characterOnStage) characterOnStage = true;
        internalShowSpeechBody();
      }
    }

    function hideSpeech() {
      speechVisible = false;
      CompanionSpeakAudio.stop();
      if (speechHideTimer) clearTimeout(speechHideTimer);
      speechHideTimer = 0;
      var st = getSettings();
      CompanionOverlay.clearSpeakAnim(root);
      CompanionOverlay.setSpeechVisible(root, false);
      CompanionOverlay.setCompanionImageMode(root, st, 'idle');
      if (st.triggerOut !== 'none') {
        CompanionOverlay.playPushOut(root, st, function () {
          characterOnStage = false;
          CompanionOverlay.setIdleAnimation(root, st.animation);
        });
      } else {
        CompanionOverlay.setIdleAnimation(root, st.animation);
      }
    }

    /** First load: optional trigger-in, then auto speak if text set */
    function bootstrap() {
      var st = getSettings();
      characterOnStage = false;
      CompanionSpeakAudio.stop();
      CompanionOverlay.clearPushLayer(root);
      CompanionOverlay.clearSpeakAnim(root);
      CompanionOverlay.setSpeechVisible(root, false);
      CompanionOverlay.setIdleAnimation(root, st.animation);
      function onEntered() {
        characterOnStage = true;
        if (st.speechText && String(st.speechText).trim()) {
          internalShowSpeechBody();
        }
      }
      if (st.triggerIn !== 'none') {
        CompanionOverlay.playPushIn(root, st, onEntered);
      } else {
        onEntered();
      }
    }

    /** Key T: replay trigger-in (preview hotkey) */
    function playReplayTriggerIn() {
      var st = getSettings();
      if (st.triggerIn === 'none') return;
      CompanionOverlay.playPushIn(root, st, function () {
        characterOnStage = true;
        CompanionOverlay.setIdleAnimation(root, st.animation);
      });
    }

    function onKeyDown(ev) {
      if (!root || root.getAttribute('data-play-mode') !== '1') return;
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
      if (ev.code === 'Space') {
        ev.preventDefault();
        if (speechVisible) hideSpeech();
        else showSpeech();
      }
      if (ev.code === 'KeyT') {
        playReplayTriggerIn();
      }
    }

    return {
      start: start,
      stop: stop,
      syncIdleFromSettings: syncIdleFromSettings,
      showSpeech: showSpeech,
      hideSpeech: hideSpeech,
      bootstrap: bootstrap,
      playReplayTriggerIn: playReplayTriggerIn,
      onKeyDown: onKeyDown,
      isSpeechVisible: function () {
        return speechVisible;
      },
    };
  }

  var CompanionAnimations = { createController: createController };

  // ——— CompanionUI ———
  function $(id) {
    return document.getElementById(id);
  }

  function syncImageUrlHttpToHidden() {
    var vis = $('field-imageUrlHttp');
    var hid = $('field-imageUrl');
    if (!vis || !hid) return;
    var t = vis.value.trim();
    if (t) hid.value = t;
  }

  function syncImageUrlHiddenToHttp() {
    var vis = $('field-imageUrlHttp');
    var hid = $('field-imageUrl');
    if (!vis || !hid) return;
    var u = hid.value.trim();
    if (/^https?:\/\//i.test(u)) vis.value = u;
    else vis.value = '';
  }

  function syncImageUrlSpeakHttpToHidden() {
    var vis = $('field-imageUrlSpeakHttp');
    var hid = $('field-imageUrlSpeak');
    if (!vis || !hid) return;
    var t = vis.value.trim();
    if (t) hid.value = t;
  }

  function syncImageUrlSpeakHiddenToHttp() {
    var vis = $('field-imageUrlSpeakHttp');
    var hid = $('field-imageUrlSpeak');
    if (!vis || !hid) return;
    var u = hid.value.trim();
    if (/^https?:\/\//i.test(u)) vis.value = u;
    else vis.value = '';
  }

  function syncSpeakSoundUrlHttpToHidden() {
    var vis = $('field-speakSoundUrlHttp');
    var hid = $('field-speakSoundUrl');
    if (!vis || !hid) return;
    var t = vis.value.trim();
    if (t) hid.value = t;
  }

  function syncSpeakSoundUrlHiddenToHttp() {
    var vis = $('field-speakSoundUrlHttp');
    var hid = $('field-speakSoundUrl');
    if (!vis || !hid) return;
    var u = hid.value.trim();
    if (/^https?:\/\//i.test(u)) vis.value = u;
    else vis.value = '';
  }

  function syncSpeakSoundCustomVisibility() {
    var wrap = $('wrap-speak-sound-custom');
    var sel = $('field-speakSound');
    if (!wrap || !sel) return;
    wrap.classList.toggle('hidden', sel.value !== 'custom');
  }

  function readForm() {
    syncImageUrlHttpToHidden();
    syncImageUrlSpeakHttpToHidden();
    syncSpeakSoundUrlHttpToHidden();
    var scalePx = parseFloat($('field-scale').value);
    var scaleValue = Number.isFinite(scalePx) && scalePx > 0 ? scalePx / IMG_LAYOUT_SIZE : CompanionConfig.DEFAULTS.scale;
    return {
      imageUrl: $('field-imageUrl').value.trim() || CompanionConfig.DEFAULTS.imageUrl,
      imageUrlSpeak: $('field-imageUrlSpeak') ? $('field-imageUrlSpeak').value.trim() : CompanionConfig.DEFAULTS.imageUrlSpeak,
      mirroring: $('field-mirroring').checked,
      scale: scaleValue,
      animation: $('field-animation').value,
      animationDuration: parseFloat($('field-animationDuration').value) || CompanionConfig.DEFAULTS.animationDuration,
      speechText: $('field-speechText').value,
      speechDuration: parseFloat($('field-speechDuration').value) || CompanionConfig.DEFAULTS.speechDuration,
      speechPosition: $('field-speechPosition').value,
      speechOffsetX: (function () {
        var n = parseFloat($('field-speechOffsetX').value);
        return clampSpeechOffset(
          Number.isFinite(n) ? n : CompanionConfig.DEFAULTS.speechOffsetX
        );
      })(),
      speechOffsetY: (function () {
        var n = parseFloat($('field-speechOffsetY').value);
        return clampSpeechOffset(
          Number.isFinite(n) ? n : CompanionConfig.DEFAULTS.speechOffsetY
        );
      })(),
      fontSize: parseInt($('field-fontSize').value, 10) || CompanionConfig.DEFAULTS.fontSize,
      speechFontFamily: readSpeechFontFamilyFromForm(),
      textColor: $('field-textColor').value || CompanionConfig.DEFAULTS.textColor,
      bubbleColor: $('field-bubbleColor').value || CompanionConfig.DEFAULTS.bubbleColor,
      bubbleOpacity: parseFloat($('field-bubbleOpacity').value) || CompanionConfig.DEFAULTS.bubbleOpacity,
      speechBubbleMinWidth: (function () {
        var n = parseInt($('field-speechBubbleMinWidth').value, 10);
        return clampSpeechBubbleSizePx(Number.isFinite(n) ? n : CompanionConfig.DEFAULTS.speechBubbleMinWidth);
      })(),
      autoHideSpeech: $('field-autoHideSpeech').checked,
      triggerIn: $('field-triggerIn').value,
      triggerOut: $('field-triggerOut').value,
      triggerDuration: (function () {
        var td = parseFloat($('field-triggerDuration').value);
        return Number.isFinite(td) ? td : CompanionConfig.DEFAULTS.triggerDuration;
      })(),
      triggerOutDuration: (function () {
        var td = parseFloat($('field-triggerDuration').value);
        td = Number.isFinite(td) ? td : CompanionConfig.DEFAULTS.triggerDuration;
        var tod = parseFloat($('field-triggerOutDuration').value);
        return Number.isFinite(tod) ? tod : td;
      })(),
      speakAnimation: $('field-speakAnimation').value,
      nonspeakAnimation: $('field-nonspeakAnimation').value,
      speakSound: clampSpeakSound($('field-speakSound') ? $('field-speakSound').value : CompanionConfig.DEFAULTS.speakSound),
      speakSoundUrl: $('field-speakSoundUrl') ? $('field-speakSoundUrl').value.trim() : CompanionConfig.DEFAULTS.speakSoundUrl,
    };
  }

  function applySpeechSearchTypeface() {
    var search = $('field-speechFontSearch');
    var listPick = $('field-speechFontListPick');
    if (!search) return;
    if (!listPick || !String(listPick.value).trim()) {
      search.style.fontFamily = '';
      return;
    }
    var f = clampSpeechFontFamilyToList(listPick.value);
    ensureGoogleFontLoaded(f);
    search.style.fontFamily = '"' + f.replace(/"/g, '') + '", ui-sans-serif, system-ui, sans-serif';
  }

  function readSpeechFontFamilyFromForm() {
    var listPick = $('field-speechFontListPick');
    var fromList = listPick && String(listPick.value).trim();
    return clampSpeechFontFamilyToList(fromList || CompanionConfig.DEFAULTS.speechFontFamily);
  }

  function writeSpeechFontFamilyToForm(settings) {
    var ff = clampSpeechFontFamilyToList(
      settings.speechFontFamily != null
        ? settings.speechFontFamily
        : CompanionConfig.DEFAULTS.speechFontFamily
    );
    var listPick = $('field-speechFontListPick');
    var search = $('field-speechFontSearch');
    if (!listPick || !search) return;
    listPick.value = ff;
    search.value = ff;
    ensureGoogleFontLoaded(ff);
    applySpeechSearchTypeface();
  }

  function updateScaleDisplay() {
    var input = $('field-scale');
    var display = $('field-scale-display');
    if (!input || !display) return;
    var value = parseFloat(input.value);
    if (!Number.isFinite(value) || value <= 0) value = Math.round(CompanionConfig.DEFAULTS.scale * IMG_LAYOUT_SIZE);
    display.textContent = Math.round(value) + ' px';
  }

  function writeForm(settings) {
    $('field-imageUrl').value = settings.imageUrl;
    syncImageUrlHiddenToHttp();
    if ($('field-imageUrlSpeak')) {
      $('field-imageUrlSpeak').value =
        settings.imageUrlSpeak != null ? String(settings.imageUrlSpeak) : CompanionConfig.DEFAULTS.imageUrlSpeak;
      syncImageUrlSpeakHiddenToHttp();
    }
    $('field-mirroring').checked = !!settings.mirroring;
    $('field-scale').value = String(
      Math.round((Number(settings.scale) > 0 ? Number(settings.scale) : CompanionConfig.DEFAULTS.scale) * IMG_LAYOUT_SIZE)
    );
    updateScaleDisplay();
    $('field-animation').value = settings.animation;
    $('field-animationDuration').value = String(settings.animationDuration);
    $('field-speechText').value = settings.speechText;
    $('field-speechDuration').value = String(settings.speechDuration);
    $('field-speechPosition').value = settings.speechPosition;
    if ($('field-speechOffsetX')) {
      $('field-speechOffsetX').value = String(clampSpeechOffset(Number(settings.speechOffsetX)));
    }
    if ($('field-speechOffsetY')) {
      $('field-speechOffsetY').value = String(clampSpeechOffset(Number(settings.speechOffsetY)));
    }
    $('field-fontSize').value = String(settings.fontSize);
    writeSpeechFontFamilyToForm(settings);
    $('field-textColor').value = settings.textColor;
    $('field-bubbleColor').value = settings.bubbleColor;
    $('field-bubbleOpacity').value = String(settings.bubbleOpacity);
    if ($('field-speechBubbleMinWidth')) {
      $('field-speechBubbleMinWidth').value = String(
        settings.speechBubbleMinWidth != null ? settings.speechBubbleMinWidth : CompanionConfig.DEFAULTS.speechBubbleMinWidth
      );
    }
    $('field-autoHideSpeech').checked = !!settings.autoHideSpeech;
    $('field-triggerIn').value = settings.triggerIn;
    $('field-triggerOut').value = settings.triggerOut;
    $('field-triggerDuration').value = String(settings.triggerDuration);
    var outDur = settings.triggerOutDuration != null ? settings.triggerOutDuration : settings.triggerDuration;
    if ($('field-triggerOutDuration')) {
      $('field-triggerOutDuration').value = String(outDur);
    }
    $('field-speakAnimation').value = settings.speakAnimation;
    $('field-nonspeakAnimation').value = settings.nonspeakAnimation;
    if ($('field-speakSound')) {
      $('field-speakSound').value =
        settings.speakSound != null ? settings.speakSound : CompanionConfig.DEFAULTS.speakSound;
    }
    if ($('field-speakSoundUrl')) {
      $('field-speakSoundUrl').value =
        settings.speakSoundUrl != null ? String(settings.speakSoundUrl) : CompanionConfig.DEFAULTS.speakSoundUrl;
      syncSpeakSoundUrlHiddenToHttp();
    }
    syncSpeakSoundCustomVisibility();
  }

  function fillSelectOptions(selectId, values, labelMap) {
    var el = $(selectId);
    if (!el || el.options.length) return;
    values.forEach(function (name) {
      var o = document.createElement('option');
      o.value = name;
      o.textContent = labelMap && labelMap[name] != null ? labelMap[name] : name;
      el.appendChild(o);
    });
  }

  function buildSpeechFontList() {
    var list = $('speech-font-listbox');
    if (!list || list.getAttribute('data-built') === '1') return;
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var fam = en.target.getAttribute('data-family');
            if (fam) ensureGoogleFontLoaded(fam);
          }
        });
      },
      { root: list, rootMargin: '100px 0px', threshold: 0 }
    );
    GOOGLE_SPEECH_FONTS.forEach(function (fam) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('data-family', fam);
      li.className =
        'cursor-pointer px-3 py-2 text-[0.9375rem] leading-snug text-zinc-100 hover:bg-zinc-800/90';
      li.style.fontFamily = '"' + fam.replace(/"/g, '') + '", ui-sans-serif, system-ui, sans-serif';
      li.textContent = fam;
      list.appendChild(li);
      obs.observe(li);
    });
    list.setAttribute('data-built', '1');
  }

  function initSpeechFontCombobox() {
    var wrap = $('wrap-speech-font-combo');
    var search = $('field-speechFontSearch');
    var listPick = $('field-speechFontListPick');
    var list = $('speech-font-listbox');
    if (!wrap || !search || !listPick || !list || wrap.getAttribute('data-combo-init') === '1') return;
    wrap.setAttribute('data-combo-init', '1');

    var activeIdx = -1;
    var visibleEls = [];

    function getVisibleOptions() {
      return Array.prototype.filter.call(list.querySelectorAll('[role="option"]'), function (li) {
        return !li.hidden;
      });
    }

    function updateActiveHighlight() {
      Array.prototype.forEach.call(list.querySelectorAll('[role="option"]'), function (li) {
        li.classList.remove('bg-sky-950/60', 'text-sky-50');
      });
      if (activeIdx >= 0 && visibleEls[activeIdx]) {
        visibleEls[activeIdx].classList.add('bg-sky-950/60', 'text-sky-50');
        visibleEls[activeIdx].scrollIntoView({ block: 'nearest' });
      }
    }

    function filterList() {
      var q = search.value.trim().toLowerCase();
      Array.prototype.forEach.call(list.querySelectorAll('[role="option"]'), function (li) {
        var fam = li.getAttribute('data-family') || '';
        li.hidden = !!(q && fam.toLowerCase().indexOf(q) === -1);
      });
      visibleEls = getVisibleOptions();
      activeIdx = visibleEls.length ? 0 : -1;
      updateActiveHighlight();
    }

    function openList() {
      list.hidden = false;
      list.classList.remove('hidden');
      search.setAttribute('aria-expanded', 'true');
      filterList();
    }

    function closeList() {
      list.hidden = true;
      list.classList.add('hidden');
      search.setAttribute('aria-expanded', 'false');
      activeIdx = -1;
      Array.prototype.forEach.call(list.querySelectorAll('[role="option"]'), function (li) {
        li.classList.remove('bg-sky-950/60', 'text-sky-50');
      });
    }

    function selectFamily(fam) {
      fam = clampSpeechFontFamilyToList(fam);
      listPick.value = fam;
      search.value = fam;
      ensureGoogleFontLoaded(fam);
      applySpeechSearchTypeface();
      closeList();
      var form = $('config-form');
      if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
    }

    search.addEventListener('focus', function () {
      openList();
    });

    search.addEventListener('input', function () {
      if (list.hidden) openList();
      else filterList();
    });

    search.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        closeList();
        if (listPick.value) search.value = listPick.value;
        return;
      }
      if (list.hidden) {
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          openList();
        }
        return;
      }
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (!visibleEls.length) return;
        activeIdx = Math.min(activeIdx + 1, visibleEls.length - 1);
        updateActiveHighlight();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!visibleEls.length) return;
        activeIdx = Math.max(activeIdx - 1, 0);
        updateActiveHighlight();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (activeIdx >= 0 && visibleEls[activeIdx]) {
          selectFamily(visibleEls[activeIdx].getAttribute('data-family'));
        }
      }
    });

    list.addEventListener('mousedown', function (ev) {
      var li = ev.target.closest('[role="option"]');
      if (!li || li.hidden) return;
      ev.preventDefault();
      selectFamily(li.getAttribute('data-family'));
    });

    document.addEventListener('click', function (ev) {
      if (!wrap.contains(ev.target)) {
        if (listPick.value) search.value = listPick.value;
        closeList();
      }
    });

    search.addEventListener('blur', function () {
      setTimeout(function () {
        if (!wrap.contains(document.activeElement)) {
          closeList();
          if (listPick.value) search.value = listPick.value;
        }
      }, 120);
    });
  }

  function fillAnimationSelects() {
    if (!$('field-animation') || !$('field-animation').options.length) {
      fillSelectOptions('field-animation', CompanionConfig.ANIMATION_OPTIONS, {
        idle: 'Idle',
        float: 'Float',
        bounce: 'Bounce',
        shake: 'Shake',
        none: 'None',
        hidden: 'Hidden (until trigger in)',
      });
      fillSelectOptions('field-triggerIn', CompanionConfig.PUSH_OPTIONS, CompanionConfig.PUSH_IN_LABELS);
      fillSelectOptions('field-triggerOut', CompanionConfig.PUSH_OPTIONS, CompanionConfig.PUSH_OUT_LABELS);
      fillSelectOptions('field-speakAnimation', CompanionConfig.SPEAK_OPTIONS, {
        none: 'None',
        shake: 'Shake',
        wobble: 'Wobble',
        vibrate: 'Vibrate',
      });
      fillSelectOptions('field-nonspeakAnimation', CompanionConfig.NONSPEAK_OPTIONS, {
        none: 'None',
        grunt: 'Grunt',
        bob: 'Nod',
        squash: 'Squash',
      });
      fillSelectOptions('field-speakSound', CompanionConfig.SPEAK_SOUND_OPTIONS, CompanionConfig.SPEAK_SOUND_LABELS);
    }
    buildSpeechFontList();
  }

  function syncConfigUrlFromForm() {
    try {
      var settings = readForm();
      var q = CompanionConfig.buildConfigEditorQuery(settings);
      var frag = speechTextHashFragment(settings);
      var next = window.location.pathname + (q ? '?' + q : '') + frag;
      var cur = window.location.pathname + window.location.search + window.location.hash;
      if (next === cur) return;
      history.replaceState(null, '', next);
    } catch (e) {}
  }

  function getPreviewDisplayMode(root) {
    if (!root) return 'settings';
    if (root.getAttribute('data-play-mode') === '1') return 'test';
    return root.getAttribute('data-config-preview-mode') === 'test' ? 'test' : 'settings';
  }

  function bindPreview(root, getSettings) {
    function refresh() {
      var s = getSettings();
      CompanionOverlay.applySettings(root, s);
      CompanionOverlay.clearPushLayer(root);
      CompanionOverlay.clearSpeakAnim(root);
      var mode = getPreviewDisplayMode(root);
      if (mode === 'settings' && s.animation === 'hidden') {
        CompanionOverlay.setIdleAnimation(root, 'none');
      } else {
        CompanionOverlay.setIdleAnimation(root, s.animation);
      }
      if (mode === 'settings') {
        CompanionOverlay.revealCompanionVisual(root);
        /* Bubble on so layout/fonts/colors can be tuned */
        CompanionOverlay.setSpeechVisible(root, true);
        var prevSpeakCb = $('field-previewSpeakingImage');
        if (prevSpeakCb) {
          var hasSp = CompanionOverlay.hasSpeakImageAsset(s);
          prevSpeakCb.disabled = !hasSp;
          if (!hasSp) prevSpeakCb.checked = false;
          if (prevSpeakCb.checked && hasSp) {
            CompanionOverlay.setCompanionImageMode(root, s, 'speak');
          }
        }
      } else {
        CompanionOverlay.setSpeechVisible(root, false);
      }
      syncSpeakSoundCustomVisibility();
      syncConfigUrlFromForm();
      refreshValidationState({ showStatus: false });
    }
    configPreviewRefresh = refresh;
    var form = $('config-form');
    if (form) {
      form.addEventListener('input', refresh);
      form.addEventListener('change', refresh);
    }
    var prevSpeakCb = $('field-previewSpeakingImage');
    if (prevSpeakCb) {
      prevSpeakCb.addEventListener('change', refresh);
    }
    refresh();
  }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      return Promise.resolve();
    } finally {
      document.body.removeChild(ta);
    }
  }

  function setStatus(message, tone) {
    var el = $('url-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('text-emerald-400', 'text-amber-400', 'text-red-400');
    if (tone === 'error') el.classList.add('text-red-400');
    else if (tone === 'warning') el.classList.add('text-amber-400');
    else el.classList.add('text-emerald-400');
  }

  function setFieldInvalid(el, invalid) {
    if (!el) return;
    el.classList.toggle('field-invalid', !!invalid);
    if (invalid) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }

  function isHttpUrlLike(value) {
    if (!value) return true;
    try {
      var u = new URL(String(value).trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function summarizeDataUrlBytes(value) {
    var raw = String(value || '');
    if (!/^data:/i.test(raw)) return 0;
    var comma = raw.indexOf(',');
    if (comma < 0) return raw.length;
    var meta = raw.slice(0, comma);
    var body = raw.slice(comma + 1);
    if (/;base64/i.test(meta)) {
      var clean = body.replace(/\s+/g, '');
      return Math.max(0, Math.floor((clean.length * 3) / 4));
    }
    try {
      return decodeURIComponent(body).length;
    } catch (e) {
      return body.length;
    }
  }

  function formatApproxBytes(bytes) {
    if (!bytes || bytes < 1024) return String(bytes || 0) + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace(/\.0$/, '') + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB';
  }

  function collectValidationIssues(settings) {
    var errors = [];
    var warnings = [];
    var playUrl = CompanionConfig.buildPlayUrl(settings);
    var dataUrlBytes = 0;

    if (!(Number(settings.scale) > 0)) errors.push('Scale must be above 0.');
    if (!(Number(settings.animationDuration) > 0)) errors.push('Idle cycle must be above 0.');
    if (!(Number(settings.speechDuration) > 0)) errors.push('Speech duration must be above 0.');
    if (!(Number(settings.bubbleOpacity) > 0 && Number(settings.bubbleOpacity) <= 1)) {
      errors.push('Bubble opacity must be above 0 and at most 1.');
    }
    if (!(Number(settings.triggerDuration) > 0)) errors.push('Trigger in duration must be above 0.');
    if (!(Number(settings.triggerOutDuration) > 0)) errors.push('Trigger out duration must be above 0.');

    if ($('field-imageUrlHttp') && $('field-imageUrlHttp').value.trim() && !isHttpUrlLike($('field-imageUrlHttp').value)) {
      errors.push('Idle image URL must start with http:// or https://.');
    }
    if (
      $('field-imageUrlSpeakHttp') &&
      $('field-imageUrlSpeakHttp').value.trim() &&
      !isHttpUrlLike($('field-imageUrlSpeakHttp').value)
    ) {
      errors.push('Speaking image URL must start with http:// or https://.');
    }
    if (settings.speakSound === 'custom' && !(settings.speakSoundUrl && String(settings.speakSoundUrl).trim())) {
      errors.push('Custom sound needs a URL or uploaded audio file.');
    }
    if (
      $('field-speakSoundUrlHttp') &&
      $('field-speakSoundUrlHttp').value.trim() &&
      !isHttpUrlLike($('field-speakSoundUrlHttp').value)
    ) {
      errors.push('Sound URL must start with http:// or https://.');
    }

    dataUrlBytes += summarizeDataUrlBytes(settings.imageUrl);
    dataUrlBytes += summarizeDataUrlBytes(settings.imageUrlSpeak);
    dataUrlBytes += summarizeDataUrlBytes(settings.speakSoundUrl);
    if (dataUrlBytes > 0) {
      warnings.push('Embedded assets add about ' + formatApproxBytes(dataUrlBytes) + ' to the URL.');
    }
    if (playUrl.length > 16000) warnings.push('Generated URL is very long and may break in OBS or tools.');
    else if (playUrl.length > 8000) warnings.push('Generated URL is getting long.');

    return {
      errors: errors,
      warnings: warnings,
      playUrl: playUrl,
      dataUrlBytes: dataUrlBytes,
    };
  }

  function refreshValidationState(options) {
    options = options || {};
    var settings = readForm();
    var issues = collectValidationIssues(settings);

    setFieldInvalid($('field-scale'), !(Number(settings.scale) > 0));
    setFieldInvalid($('field-animationDuration'), !(Number(settings.animationDuration) > 0));
    setFieldInvalid($('field-speechDuration'), !(Number(settings.speechDuration) > 0));
    setFieldInvalid($('field-bubbleOpacity'), !(Number(settings.bubbleOpacity) > 0 && Number(settings.bubbleOpacity) <= 1));
    setFieldInvalid($('field-triggerDuration'), !(Number(settings.triggerDuration) > 0));
    setFieldInvalid($('field-triggerOutDuration'), !(Number(settings.triggerOutDuration) > 0));
    setFieldInvalid(
      $('field-imageUrlHttp'),
      !!($('field-imageUrlHttp') && $('field-imageUrlHttp').value.trim() && !isHttpUrlLike($('field-imageUrlHttp').value))
    );
    setFieldInvalid(
      $('field-imageUrlSpeakHttp'),
      !!(
        $('field-imageUrlSpeakHttp') &&
        $('field-imageUrlSpeakHttp').value.trim() &&
        !isHttpUrlLike($('field-imageUrlSpeakHttp').value)
      )
    );
    setFieldInvalid(
      $('field-speakSoundUrlHttp'),
      !!(
        $('field-speakSoundUrlHttp') &&
        $('field-speakSoundUrlHttp').value.trim() &&
        !isHttpUrlLike($('field-speakSoundUrlHttp').value)
      )
    );
    setFieldInvalid($('field-speakSound'), settings.speakSound === 'custom' && !(settings.speakSoundUrl && String(settings.speakSoundUrl).trim()));

    if (options.showStatus !== false) {
      if (issues.errors.length) setStatus(issues.errors[0], 'error');
      else if (issues.warnings.length) setStatus(issues.warnings[0], 'warning');
      else if (options.successMessage) setStatus(options.successMessage, 'success');
      else setStatus('', 'success');
    }

    return issues;
  }

  function loadConfigFromText(rawText, sourceLabel) {
    var sp = CompanionConfig.parseConfigText(rawText);
    if (!sp) {
      setStatus('Could not read configuration.', 'error');
      return false;
    }
    writeForm(CompanionConfig.parseParams(sp));
    $('built-url').value = CompanionConfig.buildPlayUrl(readForm());
    setStatus('Config loaded from ' + sourceLabel + '.', 'success');
    var form = $('config-form');
    if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function setOverlayLayoutConfig(root) {
    if (!root) return;
    /* Square preview: companion centered; room for high scale */
    root.className =
      'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 [container-type:inline-size]';
  }

  /** Updated by bindPreview; used after tab changes */
  var configPreviewRefresh = function () {};

  var TAB_ACTIVE = ['border-zinc-600', 'bg-zinc-900/80', 'text-sky-400'];
  var TAB_INACTIVE = ['border-transparent', 'text-zinc-400'];

  function styleConfigTab(tab, active) {
    TAB_ACTIVE.forEach(function (c) {
      tab.classList.toggle(c, active);
    });
    TAB_INACTIVE.forEach(function (c) {
      tab.classList.toggle(c, !active);
    });
  }

  function initConfigTabs(onAfterSelect) {
    var tablist = document.querySelector('#config-tabs [role="tablist"]');
    if (!tablist) return;
    var tabs = tablist.querySelectorAll('[role="tab"]');
    function selectTab(selected) {
      tabs.forEach(function (tab) {
        var on = tab === selected;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        styleConfigTab(tab, on);
        var pid = tab.getAttribute('aria-controls');
        var panel = pid ? document.getElementById(pid) : null;
        if (panel) {
          if (on) panel.removeAttribute('hidden');
          else panel.setAttribute('hidden', '');
        }
      });
      if (typeof onAfterSelect === 'function') onAfterSelect(selected);
    }
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        selectTab(tab);
      });
      tab.addEventListener('keydown', function (ev) {
        var ix = Array.prototype.indexOf.call(tabs, tab);
        var n = tabs.length;
        var next = ix;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
          ev.preventDefault();
          next = (ix + 1) % n;
        } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          next = (ix - 1 + n) % n;
        } else if (ev.key === 'Home') {
          ev.preventDefault();
          next = 0;
        } else if (ev.key === 'End') {
          ev.preventDefault();
          next = n - 1;
        } else {
          return;
        }
        tabs[next].focus();
        selectTab(tabs[next]);
      });
    });
    var first = tablist.querySelector('[aria-selected="true"]') || tabs[0];
    if (first) selectTab(first);
  }

  function init(rootPreview) {
    fillAnimationSelects();

    var params = new URLSearchParams(window.location.search);
    var hasSayInHash = CompanionConfig.parseSpeechTextFromHash() !== null;
    if (params.toString() || hasSayInHash) {
      writeForm(CompanionConfig.parseFromLocation());
    } else {
      writeForm(CompanionConfig.DEFAULTS);
    }

    updateScaleDisplay();

    setOverlayLayoutConfig(rootPreview);
    rootPreview.setAttribute('data-config-preview-mode', 'settings');
    bindPreview(rootPreview, readForm);

    function syncPreviewModeUi(mode) {
      var bSettings = $('btn-preview-mode-settings');
      var bTest = $('btn-preview-mode-test');
      var triggerWrap = $('preview-trigger-test-wrap');
      var settingsSpeakWrap = $('preview-settings-speak-image-wrap');
      if (triggerWrap) {
        triggerWrap.classList.toggle('hidden', mode !== 'test');
      }
      if (settingsSpeakWrap) {
        settingsSpeakWrap.classList.toggle('hidden', mode !== 'settings');
      }
      if (!bSettings || !bTest) return;
      var active = 'bg-zinc-700 text-white';
      var inactive = 'text-zinc-400 hover:text-zinc-200';
      bSettings.setAttribute('aria-pressed', mode === 'settings' ? 'true' : 'false');
      bTest.setAttribute('aria-pressed', mode === 'test' ? 'true' : 'false');
      bSettings.className =
        'preview-mode-btn flex-1 rounded-md py-2 text-sm font-medium transition-colors ' +
        (mode === 'settings' ? active : inactive);
      bTest.className =
        'preview-mode-btn flex-1 rounded-md py-2 text-sm font-medium transition-colors ' +
        (mode === 'test' ? active : inactive);
    }

    function setConfigPreviewMode(mode) {
      rootPreview.setAttribute('data-config-preview-mode', mode);
      syncPreviewModeUi(mode);
      configPreviewRefresh();
    }

    syncPreviewModeUi('settings');
    var btnModeSettings = $('btn-preview-mode-settings');
    var btnModeTest = $('btn-preview-mode-test');
    if (btnModeSettings) {
      btnModeSettings.addEventListener('click', function () {
        setConfigPreviewMode('settings');
      });
    }
    if (btnModeTest) {
      btnModeTest.addEventListener('click', function () {
        setConfigPreviewMode('test');
      });
    }

    initConfigTabs(function () {
      configPreviewRefresh();
    });

    var dlgRestart = $('dialog-restart-confirm');
    var btnConfigRestart = $('btn-config-restart');
    var btnRestartCancel = $('btn-restart-cancel');
    var btnRestartConfirm = $('btn-restart-confirm');
    if (btnConfigRestart && dlgRestart && typeof dlgRestart.showModal === 'function') {
      btnConfigRestart.addEventListener('click', function () {
        dlgRestart.showModal();
      });
      dlgRestart.addEventListener('click', function (ev) {
        if (ev.target === dlgRestart) dlgRestart.close();
      });
    } else if (btnConfigRestart) {
      btnConfigRestart.addEventListener('click', function () {
        if (window.confirm('Do you really want to reset all settings? The page will reload.')) {
          window.location.href = window.location.pathname;
        }
      });
    }
    if (dlgRestart && btnRestartCancel) {
      btnRestartCancel.addEventListener('click', function () {
        dlgRestart.close();
      });
    }
    if (dlgRestart && btnRestartConfirm) {
      btnRestartConfirm.addEventListener('click', function () {
        window.location.href = window.location.pathname;
      });
    }

    initSpeechFontCombobox();

    $('btn-copy-url').addEventListener('click', function () {
      var issues = refreshValidationState();
      if (issues.errors.length) return;
      var url = issues.playUrl;
      copyToClipboard(url).then(
        function () {
          if (issues.warnings.length) setStatus('OBS link copied. ' + issues.warnings[0], 'warning');
          else setStatus('OBS link copied.', 'success');
        },
        function () {
          setStatus('Copy failed — URL is in the field.', 'warning');
          $('built-url').value = url;
        }
      );
    });

    $('btn-save-txt').addEventListener('click', function () {
      var issues = refreshValidationState();
      if (issues.errors.length) return;
      var url = issues.playUrl;
      downloadText('companion-overlay-url.txt', url);
      if (issues.warnings.length) setStatus('TXT saved. ' + issues.warnings[0], 'warning');
      else setStatus('TXT saved.', 'success');
    });

    $('btn-built-preview').addEventListener('click', function () {
      var issues = refreshValidationState();
      $('built-url').value = issues.playUrl;
      if (issues.errors.length) return;
      if (issues.warnings.length) setStatus('URL updated. ' + issues.warnings[0], 'warning');
      else setStatus('URL updated.', 'success');
    });

    var httpUrlEl = $('field-imageUrlHttp');
    if (httpUrlEl) {
      httpUrlEl.addEventListener('input', function () {
        var t = httpUrlEl.value.trim();
        if (t) $('field-imageUrl').value = t;
      });
    }

    var wrapUpload = $('wrap-image-file-upload');
    if (wrapUpload) {
      wrapUpload.classList.remove('hidden');
    }

    var httpSpeakUrlEl = $('field-imageUrlSpeakHttp');
    if (httpSpeakUrlEl) {
      httpSpeakUrlEl.addEventListener('input', function () {
        var t = httpSpeakUrlEl.value.trim();
        if (t) $('field-imageUrlSpeak').value = t;
      });
    }

    var wrapSpeakImageUpload = $('wrap-image-speak-file-upload');
    if (wrapSpeakImageUpload) {
      wrapSpeakImageUpload.classList.remove('hidden');
    }

    var inputImageSpeakFile = $('input-image-speak-file');
    if (inputImageSpeakFile) {
      inputImageSpeakFile.addEventListener('change', function (ev) {
        var file = ev.target.files && ev.target.files[0];
        if (!file) return;
        if (!/^image\/(png|gif|jpeg|webp|svg\+xml)$/i.test(file.type) && file.type.indexOf('image/') !== 0) {
          setStatus('Please choose PNG, GIF, or similar.', 'error');
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          $('field-imageUrlSpeak').value = reader.result;
          if (httpSpeakUrlEl) httpSpeakUrlEl.value = '';
          var form = $('config-form');
          if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
        };
        reader.readAsDataURL(file);
        ev.target.value = '';
      });
    }

    var wrapSpeakSoundUpload = $('wrap-speak-sound-file-upload');
    if (wrapSpeakSoundUpload) {
      wrapSpeakSoundUpload.classList.remove('hidden');
    }

    var speakSoundHttpEl = $('field-speakSoundUrlHttp');
    if (speakSoundHttpEl) {
      speakSoundHttpEl.addEventListener('input', function () {
        var t = speakSoundHttpEl.value.trim();
        if (t) $('field-speakSoundUrl').value = t;
      });
    }

    var inputSpeakSoundFile = $('input-speak-sound-file');
    if (inputSpeakSoundFile) {
      inputSpeakSoundFile.addEventListener('change', function (ev) {
        var file = ev.target.files && ev.target.files[0];
        if (!file) return;
        if (file.type.indexOf('audio/') !== 0 && !/\.(mp3|wav|ogg|oga|m4a|aac|webm|flac)$/i.test(file.name)) {
          setStatus('Please choose an audio file.', 'error');
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          $('field-speakSoundUrl').value = reader.result;
          if (speakSoundHttpEl) speakSoundHttpEl.value = '';
          var form = $('config-form');
          if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
        };
        reader.readAsDataURL(file);
        ev.target.value = '';
      });
    }

    $('input-image-file').addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      if (!/^image\/(png|gif|jpeg|webp|svg\+xml)$/i.test(file.type) && file.type.indexOf('image/') !== 0) {
        setStatus('Please choose PNG, GIF, or similar.', 'error');
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        $('field-imageUrl').value = reader.result;
        if (httpUrlEl) httpUrlEl.value = '';
        var form = $('config-form');
        if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
      };
      reader.readAsDataURL(file);
      ev.target.value = '';
    });

    var scaleEl = $('field-scale');
    if (scaleEl) {
      scaleEl.addEventListener('input', updateScaleDisplay);
      scaleEl.addEventListener('change', updateScaleDisplay);
    }

    $('btn-load-txt').addEventListener('click', function () {
      $('input-config-txt').click();
    });

    $('input-config-txt').addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        loadConfigFromText(reader.result, 'TXT');
      };
      reader.readAsText(file, 'utf-8');
      ev.target.value = '';
    });

    var btnLoadPastedConfig = $('btn-load-pasted-config');
    var fieldLoadConfig = $('field-load-config');
    if (btnLoadPastedConfig && fieldLoadConfig) {
      btnLoadPastedConfig.addEventListener('click', function () {
        var value = fieldLoadConfig.value.trim();
        if (!value) {
          setFieldInvalid(fieldLoadConfig, true);
          setStatus('Paste a URL or TXT export first.', 'error');
          return;
        }
        setFieldInvalid(fieldLoadConfig, false);
        if (loadConfigFromText(value, 'paste')) {
          fieldLoadConfig.value = '';
        } else {
          setFieldInvalid(fieldLoadConfig, true);
        }
      });
      fieldLoadConfig.addEventListener('input', function () {
        setFieldInvalid(fieldLoadConfig, false);
      });
    }

    var previewTestSeq = 0;
    var btnPreviewTest = $('btn-preview-test');
    if (btnPreviewTest) {
      btnPreviewTest.addEventListener('click', function () {
        var seq = ++previewTestSeq;
        var s = readForm();
        btnPreviewTest.disabled = true;
        CompanionSpeakAudio.stop();
        CompanionOverlay.applySettings(rootPreview, s);
        CompanionOverlay.clearPushLayer(rootPreview);
        CompanionOverlay.clearSpeakAnim(rootPreview);
        CompanionOverlay.setSpeechVisible(rootPreview, false);
        CompanionOverlay.setIdleAnimation(rootPreview, s.animation);

        function finishTest() {
          if (seq !== previewTestSeq) return;
          btnPreviewTest.disabled = false;
        }

        function afterOut() {
          if (seq !== previewTestSeq) return;
          configPreviewRefresh();
          finishTest();
        }

        function runTriggerOut() {
          if (seq !== previewTestSeq) return;
          CompanionSpeakAudio.stop();
          CompanionOverlay.clearSpeakAnim(rootPreview);
          CompanionOverlay.setSpeechVisible(rootPreview, false);
          CompanionOverlay.setCompanionImageMode(rootPreview, s, 'idle');
          if (s.triggerOut !== 'none') {
            CompanionOverlay.playPushOut(rootPreview, s, afterOut);
          } else {
            afterOut();
          }
        }

        function startSpeakPhase() {
          if (seq !== previewTestSeq) return;
          CompanionOverlay.revealCompanionVisual(rootPreview);
          CompanionOverlay.setSpeechVisible(rootPreview, false);
          CompanionOverlay.clearSpeakAnim(rootPreview);
          var speechMs = Math.max(800, (Number(s.speechDuration) || 0) * 1000);
          function startLoop() {
            if (seq !== previewTestSeq) return;
            CompanionOverlay.setCompanionImageMode(rootPreview, s, 'speak');
            CompanionOverlay.setSpeechVisible(rootPreview, true);
            CompanionOverlay.setSpeakAnim(rootPreview, s.speakAnimation);
            CompanionSpeakAudio.start(s.speakSound, { speakSoundUrl: s.speakSoundUrl });
            window.setTimeout(runTriggerOut, speechMs);
          }
          if (s.nonspeakAnimation && s.nonspeakAnimation !== 'none') {
            CompanionOverlay.playNonspeak(rootPreview, s.nonspeakAnimation, startLoop);
          } else {
            startLoop();
          }
        }

        if (s.triggerIn !== 'none') {
          CompanionOverlay.playPushIn(rootPreview, s, startSpeakPhase);
        } else {
          startSpeakPhase();
        }
      });
    }
  }

  // ——— Boot ———
  function isPlayMode() {
    var p = new URLSearchParams(window.location.search);
    return p.get('play') === '1' || p.get('play') === 'true';
  }

  function runPlayMode() {
    var settings = CompanionConfig.parseFromLocation();
    var layout = document.getElementById('desktop-layout');
    if (layout) {
      layout.hidden = true;
      layout.setAttribute('aria-hidden', 'true');
    }

    document.documentElement.classList.add('h-full', 'play-mode');
    document.body.classList.add('play-mode');

    var root = document.getElementById('companion-overlay');
    if (!root) return;

    if (root.parentElement !== document.body) {
      document.body.appendChild(root);
    }

    root.hidden = false;
    root.setAttribute('data-play-mode', '1');
    root.className =
      'pointer-events-none fixed bottom-[8%] left-1/2 flex w-auto -translate-x-1/2 flex-col items-center justify-end pb-[8%] [container-type:inline-size]';

    document.body.className = 'min-h-full h-full overflow-hidden antialiased play-mode';

    CompanionOverlay.applySettings(root, settings);

    var controller = CompanionAnimations.createController({
      root: root,
      getSettings: function () {
        return settings;
      },
    });

    controller.start();
    controller.bootstrap();

    document.addEventListener('keydown', controller.onKeyDown);
    window.__companionController = controller;
  }

  function runConfigMode() {
    document.documentElement.classList.remove('play-mode');
    document.body.classList.remove('play-mode');
    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
    document.documentElement.classList.add('h-full');
    document.documentElement.classList.remove('bg-transparent');
    document.body.className = 'min-h-screen antialiased bg-zinc-900 text-zinc-100';

    var layout = document.getElementById('desktop-layout');
    if (layout) {
      layout.hidden = false;
      layout.removeAttribute('aria-hidden');
    }

    var stage = document.getElementById('config-preview-stage');
    var root = document.getElementById('companion-overlay');
    if (stage && root && root.parentElement !== stage) {
      stage.appendChild(root);
    }

    if (root) {
      root.hidden = false;
      root.removeAttribute('data-play-mode');
    }

    init(root);
  }

  function boot() {
    if (isPlayMode()) runPlayMode();
    else runConfigMode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
