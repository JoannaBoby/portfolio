const overlay = document.querySelector("#overlay");
const sheet = document.querySelector("#sheet");
const walker = document.querySelector("#walker");
const turner = document.querySelector(".turn-inner");
const front = document.querySelector("#front");
const paw = document.querySelector(".swipe-paw");
const claws = document.querySelector("#claws");
const flash = document.querySelector("#flash");
const skip = document.querySelector("#skip");
const about = document.querySelector("#about");
const canvas = document.querySelector("#maskSrc");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

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

function sizeMask() {
  const rect = sheet.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  applyMask();
}

function applyMask() {
  const url = canvas.toDataURL("image/png");
  const value = `url("${url}")`;
  sheet.style.maskImage = value;
  sheet.style.webkitMaskImage = value;
  sheet.style.maskSize = "100% 100%";
  sheet.style.webkitMaskSize = "100% 100%";
  sheet.style.maskRepeat = "no-repeat";
  sheet.style.webkitMaskRepeat = "no-repeat";
}

function bundle(origin, angle, length, draw) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  [-26, 0, 26].forEach((offset) => {
    const x1 = origin.x + px * offset * 0.12;
    const y1 = origin.y + py * offset * 0.12;
    const x2 = origin.x + dx * length + px * offset;
    const y2 = origin.y + dy * length + py * offset;
    draw(x1, y1, x2, y2);
  });
}

function curve(x1, y1, x2, y2) {
  const cx1 = x1 + (x2 - x1) * 0.35;
  const cy1 = y1 + (y2 - y1) * 0.12;
  const cx2 = x1 + (x2 - x1) * 0.62;
  const cy2 = y1 + (y2 - y1) * 0.72;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function scratch(index) {
  const stage = sheet.getBoundingClientRect();
  const pawRect = paw.getBoundingClientRect();
  const origin = {
    x: pawRect.left + pawRect.width * 0.62 - stage.left,
    y: pawRect.top + pawRect.height * 0.22 - stage.top,
  };
  const aims = [
    [0.22, 0.36],
    [0.3, 0.28],
    [0.18, 0.44],
  ];
  const [tx, ty] = aims[index] ?? aims[0];
  const target = { x: stage.width * tx, y: stage.height * ty };
  const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
  const length = Math.hypot(target.x - origin.x, target.y - origin.y);

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 30;
  bundle(origin, angle, length, (x1, y1, x2, y2) => {
    ctx.stroke(new Path2D(curve(x1, y1, x2, y2)));
  });
  ctx.restore();
  applyMask();

  const svgNS = "http://www.w3.org/2000/svg";
  bundle(origin, angle, length, (x1, y1, x2, y2) => {
    ["soft", "glint"].forEach((kind) => {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", curve(x1, y1, x2, y2));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", kind === "soft" ? "rgba(255,255,255,0.35)" : "rgba(255,252,247,0.95)");
      path.setAttribute("stroke-width", kind === "soft" ? "9" : "3");
      path.setAttribute("stroke-linecap", "round");
      claws.appendChild(path);
      const mark = path.getTotalLength();
      path.style.strokeDasharray = `${mark}`;
      path.style.strokeDashoffset = `${mark}`;
      requestAnimationFrame(() => {
        path.style.transition = "stroke-dashoffset 160ms linear";
        path.style.strokeDashoffset = "0";
      });
    });
  });

  const x = ((pawRect.left + pawRect.width / 2 - stage.left) / stage.width) * 100;
  const y = ((pawRect.top + pawRect.height / 2 - stage.top) / stage.height) * 100;
  flash.style.setProperty("--x", `${x}%`);
  flash.style.setProperty("--y", `${y}%`);
  flash.classList.remove("on");
  void flash.offsetWidth;
  flash.classList.add("on");
}

function swipe(index) {
  paw.classList.remove("hit");
  void paw.offsetWidth;
  paw.classList.add("hit");
  later(() => scratch(index), 170);
}

function placeFrontCat() {
  const stage = overlay.getBoundingClientRect();
  const cat = walker.getBoundingClientRect();
  front.style.left = `${cat.left - stage.left + cat.width * 0.62}px`;
  front.style.bottom = `${stage.bottom - cat.bottom - 6}px`;
  front.classList.add("show");
}

function arrive() {
  walker.classList.add("pause");
  later(() => {
    turner.classList.add("turn");
    later(() => {
      walker.style.visibility = "hidden";
      placeFrontCat();
      later(() => swipe(0), 520);
      later(() => swipe(1), 1040);
      later(() => swipe(2), 1560);
      later(finish, 2500);
    }, 280);
  }, 420);
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
  }, 980);
}

function start() {
  sizeMask();
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

window.addEventListener("resize", () => {
  if (!finished && claws.childElementCount === 0) sizeMask();
});
