"use strict";
const $ = id => document.getElementById(id);
const canvas = $("scene");
const ctx = canvas.getContext("2d");
const colors = ["#37b8ef", "#ffc845", "#91d33e", "#a775f6", "#ff8a46", "#f36375"];
const scenarios = {target: [6.4, 3.3], fast: [6.4, 1.25], low: [5.0, 3.3], slow: [6.4, 4.6]};
let config, reps = [], level = 1, sessionId = crypto.randomUUID();
let state = "loading", peak = 0, started = 0, duration = 0, elapsed = 0, height = 0;
let manualSource = null, saved = false, saving = false, locked = false;

function rounded(x, y, w, h, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}
function line(points, color, width) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  points.slice(1).forEach(point => ctx.lineTo(...point));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}
function hill(y, color, offset) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  for (let x = 0; x <= 1200; x += 20) ctx.lineTo(x, y + 36 * Math.sin(x / 124 + offset) + 19 * Math.cos(x / 72));
  ctx.lineTo(1200, 600);
  ctx.lineTo(0, 600);
  ctx.fillStyle = color;
  ctx.fill();
}
function block(x, y, w, h, color, crooked = false) {
  ctx.save();
  ctx.translate(x, y);
  if (crooked) ctx.rotate(.05);
  rounded(-w / 2, 0, w, h, 6, color, "#15364b72");
  rounded(-w / 2 + 7, 4, w - 14, 4, 2, "#ffffff72");
  line([[-w / 2 + 9, h - 5], [w / 2 - 9, h - 5]], "#15364b36", 3);
  ctx.restore();
}
function draw() {
  const sky = ctx.createLinearGradient(0, 0, 0, 550);
  sky.addColorStop(0, "#30b0f4");
  sky.addColorStop(1, "#a5edff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1200, 660);
  for (const [x, y, s] of [[136, 174, 1], [694, 176, 1.2], [1030, 127, .8], [555, 283, .6]]) {
    ctx.fillStyle = "#e6faffb5";
    for (const [dx, dy, rx, ry] of [[-30, 7, 39, 13], [0, 0, 36, 22], [32, 8, 42, 12]]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  hill(440, "#6ac7e7", 3);
  hill(484, "#4eafae", 1);
  for (let i = 0; i < 38; i++) {
    const x = i * 34, y = 547 + 33 * Math.sin(i * .65), h = 23 + (i * 13) % 53;
    ctx.beginPath();
    ctx.moveTo(x, y - h); ctx.lineTo(x - h * .34, y); ctx.lineTo(x + h * .34, y);
    ctx.fillStyle = i % 2 ? "#378f8b" : "#449f92";
    ctx.fill();
  }
  hill(557, "#75b95d", 0);
  rounded(0, 602, 1200, 58, 0, "#e5a55c");
  rounded(0, 611, 1200, 49, 0, "#bd753f");
  for (let x = 0; x < 1200; x += 120) line([[x, 637], [x + 94, 637]], "#dc9659", 3);
  for (const x of [118, 1026]) {
    rounded(x, 537, 92, 67, 5, "#ac6237", "#754426");
    line([[x + 9, 546], [x + 83, 546], [x + 83, 595], [x + 9, 595], [x + 9, 546], [x + 83, 595]], "#dc9257", 5);
  }
  rounded(277, 570, 112, 31, 7, "#526478", "#35475d");
  rounded(294, 552, 80, 22, 5, "#718399", "#35475d");
  for (let y = 239; y < 530; y += 50) line([[314, y], [350, y + 50], [314, y + 50]], "#db8d13", 8);
  line([[312, 547], [312, 202], [351, 202], [351, 547]], "#b76e15", 15);
  line([[312, 547], [312, 202], [351, 202], [351, 547]], "#ffc343", 9);
  line([[310, 207], [660, 96], [632, 137], [310, 242], [310, 207]], "#b36a16", 14);
  line([[310, 207], [660, 96], [632, 137], [310, 242], [310, 207]], "#ffc432", 8);
  for (let i = 0; i < 6; i++) {
    const x = 347 + i * 47, y = 195 - i * 15;
    line([[x, y], [x + 12, y + 31], [x + 44, y - 14]], "#ffbf32", 7);
  }
  rounded(276, 191, 122, 116, 14, "#ffc332", "#ad651a");
  rounded(289, 204, 93, 72, 9, "#16668a", "#ee951b");
  ctx.fillStyle = "#f8bf87";
  ctx.beginPath(); ctx.arc(337, 244, 21, 0, Math.PI * 2); ctx.fill();
  rounded(314, 253, 46, 20, 8, "#ec791d");
  rounded(312, 222, 49, 12, 6, "#ffcc40");
  rounded(321, 210, 31, 19, 10, "#ffcc40");
  rounded(287, 293, 102, 12, 6, "#e89419");
  rounded(512, 581, 276, 22, 5, "#d38338", "#a15d26");
  const blockHeight = 26;
  reps.forEach((rep, index) => {
    const w = 218 - index * 6;
    block(650 + (rep.onTarget ? 0 : index % 2 ? -18 : 18), 581 - (index + 1) * blockHeight, w, blockHeight, colors[index % colors.length], !rep.onTarget);
  });
  if (reps.length < (config?.goal ?? 12)) {
    const slot = 581 - (reps.length + 1) * blockHeight;
    const y = slot - 14 - (state === "ready" ? 0 : height) * 9;
    const w = 218 - reps.length * 6;
    if (state === "raised" || state === "lowering" || state === "auto") {
      ctx.setLineDash([6, 6]);
      line([[650 - w / 2, slot + blockHeight], [650 - w / 2, slot], [650 + w / 2, slot], [650 + w / 2, slot + blockHeight]], "#f5ffff", 2);
      ctx.setLineDash([]);
    }
    line([[650, 108], [650, y - 29]], "#344459", 4);
    line([[650 - w * .3, y], [650, y - 27], [650 + w * .3, y]], "#59412c", 4);
    rounded(643, y - 35, 14, 14, 7, "#ffd344", "#885119");
    block(650, y, w, blockHeight, colors[reps.length % colors.length]);
  }
  for (const x of [235, 920]) {
    rounded(x - 18, 599, 36, 8, 3, "#ba4b2c");
    ctx.beginPath(); ctx.moveTo(x - 13, 600); ctx.lineTo(x - 4, 569); ctx.lineTo(x + 4, 569); ctx.lineTo(x + 13, 600);
    ctx.fillStyle = "#fa783c"; ctx.fill();
    line([[x - 8, 585], [x + 8, 585]], "#fff1c9", 5);
  }
}
function meter(id, value, max) {
  const gauge = $(id);
  gauge.setAttribute("aria-valuenow", Math.min(value, max).toFixed(1));
  gauge.firstElementChild.style.height = Math.min(100, value / max * 100) + "%";
}
function display() {
  $("height").textContent = height.toFixed(1) + " cm";
  $("pace").textContent = elapsed.toFixed(1) + " s";
  meter("height-track", height, 9);
  meter("pace-track", elapsed, 5);
  draw();
}
function feedback(message, result = "") {
  $("feedback").textContent = message;
  $("feedback").dataset.result = result;
}
function controls() {
  const idle = state === "ready" && !locked && !saving;
  $("raise").disabled = !idle;
  $("simulate").disabled = !idle;
  $("scenario").disabled = !idle;
  $("lower").disabled = !["raised", "lowering"].includes(state);
  $("save").disabled = !reps.length || !["ready", "complete"].includes(state) || saved || saving;
  $("pain").disabled = saving || locked;
  $("next").hidden = !(saved && state === "complete");
}
function raise(automatic) {
  if (state !== "ready" || locked || saving) return;
  [peak, duration] = scenarios[$("scenario").value];
  height = peak;
  elapsed = 0;
  state = automatic ? "auto" : "raised";
  started = performance.now();
  display();
  controls();
  feedback(automatic ? "Lowering automatically…" : "Block lifted. Hold Lower, then release to land.");
  if (automatic) requestAnimationFrame(tick);
}
function lower(source) {
  if (state !== "raised") return;
  state = "lowering";
  manualSource = source;
  started = performance.now();
  feedback("Release to land between the target times.");
  requestAnimationFrame(tick);
}
function tick(now) {
  if (state !== "auto" && state !== "lowering") return;
  const auto = state === "auto";
  const seconds = Math.max(0, (now - started) / 1000);
  if ((auto && seconds >= duration) || seconds >= 120) {
    land(auto ? duration : 120);
    return;
  }
  elapsed = seconds;
  height = peak * Math.max(.07, 1 - elapsed / (auto ? duration : 3.5));
  display();
  requestAnimationFrame(tick);
}
function land(seconds) {
  elapsed = Math.min(120, Math.max(.01, Math.round(seconds * 100) / 100));
  const onTarget = peak >= config.height[0] && peak <= config.height[1] && elapsed >= config.pace[0] && elapsed <= config.pace[1];
  reps.push({height: peak, pace: elapsed, onTarget});
  manualSource = null;
  height = peak;
  state = reps.length === config.goal ? "complete" : "ready";
  const result = onTarget ? "Great landing!" : peak < config.height[0] ? "Height below target" : elapsed < config.pace[0] ? "Lowering was too fast" : "Lowering was too slow";
  feedback(state === "complete" ? result + " Tower complete!" : result, onTarget ? "good" : "miss");
  $("reps").textContent = reps.length + " / " + config.goal;
  $("progress").value = reps.length;
  display();
  controls();
}
function release(source) {
  if (state === "lowering" && manualSource === source) land((performance.now() - started) / 1000);
}
$("raise").onclick = () => raise(false);
$("simulate").onclick = () => raise(true);
$("lower").addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  lower(event.pointerId);
});
$("lower").addEventListener("pointerup", event => release(event.pointerId));
function cancelLower() {
  if (state !== "lowering") return;
  state = "raised";
  manualSource = null;
  height = peak;
  elapsed = 0;
  display();
  feedback("Block lifted. Hold Lower, then release to land.");
}
$("lower").addEventListener("pointercancel", cancelLower);
window.addEventListener("blur", cancelLower);
window.addEventListener("keydown", event => {
  if (event.target.matches("select, input, textarea") || event.altKey || event.ctrlKey || event.metaKey) return;
  if (["ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    if (!event.repeat) event.key === "ArrowUp" ? raise(false) : lower(event.key);
  } else if (event.target === $("lower") && [" ", "Enter"].includes(event.key)) {
    event.preventDefault();
    if (!event.repeat) lower(event.key);
  }
});
window.addEventListener("keyup", event => release(event.key));

for (let n = 0; n <= 10; n++) $("pain").add(new Option(String(n), String(n)));
$("save-form").onsubmit = async event => {
  event.preventDefault();
  if ($("save").disabled) return;
  saving = true;
  locked = true;
  $("save-status").textContent = "Saving…";
  controls();
  try {
    const pain = $("pain").value;
    const response = await fetch("/api/sessions", {method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({id: sessionId, pain: pain === "" ? null : Number(pain), reps})});
    if (!response.ok) throw new Error();
    saved = true;
    $("next").textContent = state === "complete" ? "Next level" : "New session";
    $("save-status").textContent = "Saved to the physician portal.";
  } catch {
    $("save-status").textContent = "Could not confirm the save. Retry Save session.";
  } finally {
    saving = false;
    controls();
    $("next").hidden = !saved;
  }
};
$("next").onclick = () => {
  if (state === "complete") level++;
  state = "ready";
  reps = [];
  height = elapsed = 0;
  saved = locked = false;
  sessionId = crypto.randomUUID();
  $("pain").value = "";
  $("scenario").value = "target";
  $("save-status").textContent = "";
  $("level").textContent = "Level " + level;
  $("progress").value = 0;
  $("reps").textContent = "0 / " + config.goal;
  feedback("Ready to build!");
  display();
  controls();
};
draw();
fetch("/api/config").then(response => {
  if (!response.ok) throw new Error();
  return response.json();
}).then(data => {
  config = data;
  for (const [id, range, unit] of [["height-target", data.height, "cm"], ["pace-target", data.pace, "s"]]) {
    $(id).textContent = range.map(value => value.toFixed(1)).join("–") + " " + unit;
  }
  $("progress").max = config.goal;
  $("reps").textContent = "0 / " + config.goal;
  state = "ready";
  controls();
}).catch(() => feedback("Simulator unavailable. Reload to retry.", "miss"));
