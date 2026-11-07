const overlay = document.querySelector("#overlay");
const walker = document.querySelector("#walker");
const skip = document.querySelector("#skip");
const about = document.querySelector("#about");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const timers = [];
let finished = false;

function later(fn, ms) {
  const id = setTimeout(fn, ms);
  timers.push(id);
}

function clearTimers() {
  while (timers.length) clearTimeout(timers.pop());
}

function arrive() {
  walker.classList.add("pause", "wave");
  later(() => {
    walker.classList.add("hop");
    finish();
  }, 1400);
}

function finish() {
  if (finished) return;
  finished = true;
  clearTimers();
  document.body.classList.remove("intro");
  document.body.classList.add("revealed");
  overlay.classList.add("leaving");
  skip.hidden = true;
  later(() => {
    overlay.hidden = true;
    about.focus({ preventScroll: true });
    document.querySelector(".deck-nav").hidden = false;
    syncNav();
  }, 900);
}

function start() {
  if (reduceMotion) {
    finish();
    return;
  }
  later(() => {
    walker.classList.add("go");
  }, 650);
}

skip.addEventListener("click", finish);
walker.addEventListener("animationend", (event) => {
  if (event.animationName !== "cross") return;
  arrive();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}

const catSource = document.querySelector(".about-cat");
document.querySelectorAll(".slide").forEach((slide) => {
  if (slide.id === "hobbies" || slide.querySelector(".page-cat")) return;
  const cat = catSource.cloneNode(true);
  cat.classList.remove("about-cat");
  slide.appendChild(cat);
});

const slides = [...document.querySelectorAll(".slide")];
const effects = ["push", "wipe", "split"];
const glass = document.querySelector("#glass");
const stepGraph = document.querySelector("#step-graph");
const burn = document.querySelector("#burn");
let index = 0;
let busy = false;

function scan(to, done) {
  done();
}

function mergeHobbies(from, to, done) {
  const cards = [...from.querySelectorAll(".hobby-grid li")];
  const box = to.querySelector(".achieve-box");
  to.hidden = false;
  to.classList.add("is-current");
  from.style.zIndex = "4";
  to.style.zIndex = "3";
  box.classList.add("merge-ready");

  const boxRect = box.getBoundingClientRect();
  const targetX = boxRect.left + boxRect.width / 2;
  const targetY = boxRect.top + boxRect.height / 2;
  const clones = cards.map((card) => {
    const rect = card.getBoundingClientRect();
    const clone = card.cloneNode(true);
    clone.classList.add("merge-card");
    clone.style.left = rect.left + "px";
    clone.style.top = rect.top + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    document.body.appendChild(clone);
    card.style.visibility = "hidden";
    return { clone, rect };
  });

  from.classList.add("merge-fade");
  requestAnimationFrame(() => {
    box.classList.add("merge-in");
    clones.forEach(({ clone, rect }, i) => {
      const dx = targetX - (rect.left + rect.width / 2);
      const dy = targetY - (rect.top + rect.height / 2);
      clone.style.transition = `transform 1.15s cubic-bezier(0.4, 0, 0.2, 1) ${i * 70}ms, opacity 1.15s ease ${i * 70}ms`;
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.12)`;
      clone.style.opacity = "0";
    });
  });

  setTimeout(() => {
    clones.forEach(({ clone }) => clone.remove());
    cards.forEach((card) => { card.style.visibility = ""; });
    box.classList.remove("merge-ready", "merge-in");
    from.style.zIndex = "";
    to.style.zIndex = "";
    done();
  }, 1900);
}

function burnPoints(t, w, h) {
  const p = Math.pow(t, 0.78);
  const cx = w * (0.5 + 0.12 * Math.sin(t * 2.6) * p);
  const cy = h * (0.48 + 0.08 * Math.cos(t * 3.2) * p);
  const cover = Math.hypot(w, h) * 0.64;
  const pts = [];
  const count = 64;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const rush = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(a * 2 - 0.7));
    const side = Math.cos(a) < -0.1 ? 1.45 : 0.72;
    const gamma = 0.38 + 1.7 * rush * side;
    const eaten = 1 - Math.pow(1 - p, gamma);
    const chew = 0.07 * Math.sin(13 * a + t * 20) + 0.045 * Math.sin(23 * a - t * 27);
    const wobble = Math.max(0.48, 1 + p * (0.34 * Math.sin(2 * a + 0.4) + 0.22 * Math.sin(5 * a - 1.1)) + chew);
    const radius = cover * (1 - eaten) * wobble;
    pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return pts;
}

function addBurn(ctx, pts) {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function outward(pts, i) {
  const prev = pts[(i + pts.length - 1) % pts.length];
  const next = pts[(i + 1) % pts.length];
  const tx = next[0] - prev[0];
  const ty = next[1] - prev[1];
  const len = Math.hypot(ty, tx) || 1;
  return [ty / len, -tx / len];
}

function paintBurn(ctx, from, t, now, state, w, h) {
  const pts = burnPoints(t, w, h);
  from.style.clipPath = `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;
  from.style.filter = "none";

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  addBurn(ctx, pts);
  ctx.clip("evenodd");
  ctx.fillStyle = "rgba(8, 5, 4, 0.14)";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  addBurn(ctx, pts);
  ctx.clip();
  ctx.lineJoin = "round";
  ctx.beginPath();
  addBurn(ctx, pts);
  ctx.strokeStyle = "rgba(10, 5, 3, 0.95)";
  ctx.lineWidth = 42;
  ctx.stroke();
  ctx.strokeStyle = "rgba(78, 28, 8, 0.75)";
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.restore();

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  addBurn(ctx, pts);
  ctx.strokeStyle = "rgba(255, 110, 24, 0.8)";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 236, 196, ${0.7 + 0.3 * Math.sin(now / 45)})`;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  for (let i = 0; i < pts.length; i += 1) {
    const seed = Math.sin(i * 12.7);
    if (seed < -0.15) continue;
    const [x, y] = pts[i];
    const [nx, ny] = outward(pts, i);
    const flick = 0.25 + 0.75 * Math.abs(Math.sin(now / 90 + i * 2.1));
    const tall = seed > 0.82 ? 1.85 : seed > 0.35 ? 0.95 : 0.42;
    const len = (8 + 28 * flick) * tall;
    const spread = (4 + 9 * (0.4 + 0.6 * flick)) * (tall > 1 ? 0.7 : 1);
    const tipx = x + nx * len;
    const tipy = y + ny * len - len * 0.28;
    const g = ctx.createLinearGradient(x, y, tipx, tipy);
    g.addColorStop(0, "rgba(255, 244, 210, 0.92)");
    g.addColorStop(0.22, "rgba(255, 168, 48, 0.72)");
    g.addColorStop(0.62, "rgba(200, 48, 8, 0.28)");
    g.addColorStop(1, "rgba(120, 16, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + ny * spread, y - nx * spread);
    ctx.bezierCurveTo(
      x + nx * len * 0.35 + ny * spread * 1.15,
      y + ny * len * 0.35 - nx * spread * 1.15,
      tipx + ny * spread * 0.28,
      tipy - nx * spread * 0.28,
      tipx,
      tipy
    );
    ctx.bezierCurveTo(
      tipx - ny * spread * 0.28,
      tipy + nx * spread * 0.28,
      x + nx * len * 0.45 - ny * spread,
      y + ny * len * 0.45 + nx * spread,
      x - ny * spread * 0.85,
      y + nx * spread * 0.85
    );
    ctx.fill();
  }

  if (state.embers.length < 90) {
    const i = (state.tick * 3) % pts.length;
    const [x, y] = pts[i];
    const [nx, ny] = outward(pts, i);
    state.embers.push({
      x: x + nx * 8,
      y: y + ny * 4,
      vx: nx * 0.35 + (Math.random() - 0.5) * 0.8,
      vy: -1.1 - Math.random() * 1.8,
      life: 1,
      r: 0.8 + Math.random() * 2.1
    });
  }
  if (state.smoke.length < 28 && state.tick % 2 === 0) {
    const i = state.tick % pts.length;
    const [x, y] = pts[i];
    const [nx, ny] = outward(pts, i);
    state.smoke.push({
      x: x + nx * 18,
      y: y + ny * 8,
      vx: nx * 0.25 + (Math.random() - 0.5) * 0.3,
      vy: -0.45 - Math.random() * 0.4,
      life: 1,
      r: 10 + Math.random() * 12
    });
  }
  state.tick += 1;

  state.smoke.forEach((s) => {
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 0.008;
    s.r += 0.55;
    ctx.globalAlpha = Math.max(0, s.life) * 0.2;
    ctx.fillStyle = "#1a1618";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r, s.r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  state.embers.forEach((e) => {
    e.x += e.vx;
    e.y += e.vy;
    e.vy -= 0.03;
    e.life -= 0.016;
    ctx.globalAlpha = Math.max(0, e.life);
    ctx.fillStyle = e.life > 0.55 ? "#ffe1b0" : "#ff6a1c";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (0.6 + e.life), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  state.embers = state.embers.filter((e) => e.life > 0);
  state.smoke = state.smoke.filter((s) => s.life > 0);
}

let burnFrame = 0;

function burnToHobbies(from, to, done) {
  to.hidden = false;
  to.classList.add("is-current");
  to.style.zIndex = "1";
  from.style.zIndex = "3";
  from.classList.add("burning");
  const canvas = burn.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  burn.hidden = false;
  const start = performance.now();
  const duration = 2400;
  const state = { embers: [], smoke: [], tick: 0 };

  const draw = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pw = Math.floor(w * dpr);
    const ph = Math.floor(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    paintBurn(ctx, from, t, now, state, w, h);
    if (t < 1) burnFrame = requestAnimationFrame(draw);
  };

  burnFrame = requestAnimationFrame(draw);
  setTimeout(() => {
    cancelAnimationFrame(burnFrame);
    from.classList.remove("is-current", "burning");
    from.style.zIndex = "";
    from.style.clipPath = "";
    from.style.filter = "";
    from.hidden = true;
    to.style.zIndex = "";
    burn.hidden = true;
    done();
  }, duration);
}

function growSteps(from, to, done) {
  to.hidden = false;
  from.hidden = true;
  from.classList.remove("is-current", "landed");
  stepGraph.hidden = false;
  stepGraph.classList.remove("run");
  void stepGraph.offsetWidth;
  stepGraph.classList.add("run");
  setTimeout(() => {
    stepGraph.classList.remove("run");
    stepGraph.hidden = true;
    to.classList.add("is-current");
    done();
  }, 2400);
}

function go(next) {
  if (!finished || busy || next === index || next < 0 || next >= slides.length) return;
  const from = slides[index];
  const to = slides[next];

  const finishSwitch = () => {
    index = next;
    busy = false;
    syncNav();
    to.focus({ preventScroll: true });
  };

  if (!reduceMotion && to.id === "projects") {
    busy = true;
    growSteps(from, to, finishSwitch);
    return;
  }

  if (!reduceMotion && from.id === "projects" && to.id === "hobbies") {
    busy = true;
    burnToHobbies(from, to, finishSwitch);
    return;
  }

  if (!reduceMotion && from.id === "hobbies" && to.id === "achievements") {
    busy = true;
    mergeHobbies(from, to, () => {
      from.classList.remove("is-current", "merge-fade");
      from.hidden = true;
      to.classList.add("is-current");
      finishSwitch();
    });
    return;
  }

  from.classList.remove("is-current", "outgoing", "run", "landed");
  from.hidden = true;
  delete from.dataset.effect;
  delete from.dataset.dir;
  to.hidden = false;
  to.classList.remove("incoming", "run");
  to.classList.add("is-current");
  if (to.id === "skills") to.classList.add("landed");
  delete to.dataset.effect;
  delete to.dataset.dir;
  finishSwitch();
}

function syncNav() {
  const id = slides[index].id;
  document.querySelectorAll(".top-nav a").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.go === id);
  });
}

document.querySelector("#nextSection").addEventListener("click", () => go(index + 1));
document.querySelector("#prevSection").addEventListener("click", () => go(index - 1));

document.querySelector(".top-nav").addEventListener("click", (event) => {
  const link = event.target.closest("[data-go]");
  if (!link) return;
  event.preventDefault();
  if (!finished) finish();
  const next = slides.findIndex((slide) => slide.id === link.dataset.go);
  go(next);
});

const phone = window.matchMedia("(pointer: coarse)");

window.addEventListener("wheel", (event) => {
  if (!finished || phone.matches) return;
  if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) return;
  if (Math.abs(event.deltaY) < 24) return;
  const current = slides[index];
  if (current.scrollHeight > current.clientHeight + 8) {
    const atTop = current.scrollTop <= 0;
    const atBottom = current.scrollTop + current.clientHeight >= current.scrollHeight - 8;
    if (event.deltaY > 0 && !atBottom) return;
    if (event.deltaY < 0 && !atTop) return;
  }
  event.preventDefault();
  go(index + (event.deltaY > 0 ? 1 : -1));
}, { passive: false });

window.addEventListener("keydown", (event) => {
  if (!finished) return;
  if (event.key === "ArrowDown" || event.key === "PageDown") go(index + 1);
  if (event.key === "ArrowUp" || event.key === "PageUp") go(index - 1);
});


document.querySelector(".contact-card form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".form-status");
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim();
  const message = String(data.get("message") || "").trim();
  const subject = encodeURIComponent("Portfolio message from " + name);
  const body = encodeURIComponent("Name: " + name + "\nEmail: " + email + "\n\n" + message);
  window.location.href = "mailto:joannaboby@gmail.com?subject=" + subject + "&body=" + body;
  status.hidden = false;
  status.textContent = "Your email app will open. Send that email and it reaches joannaboby@gmail.com.";
});

const pieces = {
  dance: { title: "Dancing", images: [["hobby-dancing.jpg", "Dance group in white and gold costumes"]] },
  sing: { title: "Singing", images: [["hobby-singing.jpg", "Choir singing on stage"]] },
  sport: { title: "Playing sports", images: [["hobby-sports.jpg", "Football team on the field"]] },
  draw: {
    title: "Drawing and designing",
    images: [
      ["hobby-clay.jpg", "Clay flowers in a pot"],
      ["hobby-mandala.jpg", "Pink and purple mandala drawing"]
    ]
  },
  code: { title: "Coding", images: [["hobby-coding.jpg", "Karnataka tourism website"]] },
  travel: { title: "Travelling", images: [["hobby-travel.jpg", "Friends by a forest stream"]] }
};

const burst = document.querySelector("#burst");
const burstPhotos = burst.querySelector(".burst-photos");
const burstCaption = burst.querySelector("figcaption");

function openBurst(id) {
  const piece = pieces[id];
  if (!piece) return;
  burstPhotos.classList.toggle("pair", piece.images.length > 1);
  burstPhotos.classList.toggle("shot", id === "code");
  burstPhotos.innerHTML = piece.images.map(([src, alt]) => `<img src="${src}" alt="${alt}">`).join("");
  burstCaption.textContent = piece.title;
  burst.hidden = false;
  burst.classList.remove("open");
  void burst.offsetWidth;
  burst.classList.add("open");
}

function closeBurst() {
  burst.classList.remove("open");
  setTimeout(() => {
    if (!burst.classList.contains("open")) burst.hidden = true;
  }, 420);
}

document.querySelector(".hobby-grid").addEventListener("click", (event) => {
  const card = event.target.closest("[data-piece]");
  if (!card) return;
  openBurst(card.dataset.piece);
});

burst.querySelector(".burst-close").addEventListener("click", closeBurst);
burst.addEventListener("click", (event) => {
  if (event.target.closest(".burst-piece")) return;
  closeBurst();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !burst.hidden) closeBurst();
});
