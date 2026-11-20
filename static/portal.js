"use strict";
const $ = id => document.getElementById(id);
const mean = values => values.reduce((total, value) => total + value, 0) / values.length;
const deviation = values => {
  const center = mean(values);
  return Math.sqrt(mean(values.map(value => (value - center) ** 2)));
};
const percent = reps => 100 * reps.filter(rep => rep.onTarget).length / reps.length;
const timestamp = new Intl.DateTimeFormat(undefined, {dateStyle: "medium", timeStyle: "short"});
const shortDate = new Intl.DateTimeFormat(undefined, {month: "short", day: "numeric"});
const metrics = {
  height: {label: "Mean heel height", max: 9, unit: "cm", band: "height"},
  pace: {label: "Mean lowering time", max: 6, unit: "s", band: "pace"},
  target: {label: "On-target repetitions", max: 100, unit: "%"},
  consistency: {label: "Height standard deviation", max: 1, unit: "cm"},
  paceConsistency: {label: "Lowering time standard deviation", max: 1, unit: "s"},
  pain: {label: "Reported pain", max: 10, unit: "/ 10"},
  count: {label: "Completed repetitions", max: 12, unit: "reps"}
};
let sessions = [], filtered = [], config, selected = null, request = 0;

function describe(session) {
  const heights = session.reps.map(rep => rep.height);
  const paces = session.reps.map(rep => rep.pace);
  return {...session, source: session.id.startsWith("sample-") ? "sample" : "sim", height: mean(heights),
    pace: mean(paces), consistency: deviation(heights), paceConsistency: deviation(paces),
    target: percent(session.reps), count: session.reps.length, date: new Date(session.recorded)};
}
function cell(row, content) {
  const td = row.insertCell();
  if (typeof content === "string") td.textContent = content;
  else td.append(content);
}
function messageRow(body, columns, message) {
  const td = body.insertRow().insertCell();
  td.colSpan = columns;
  td.textContent = message;
}
function drawTrend() {
  const canvas = $("trend");
  const width = canvas.clientWidth, height = 202, ratio = window.devicePixelRatio || 1;
  if (!width) return;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.font = "12px system-ui";
  const name = $("metric").value, metric = metrics[name];
  $("band-key").hidden = !metric.band;
  const dates = [...filtered].reverse();
  const available = dates.filter(session => session[name] !== null);
  if (!available.length) {
    ctx.fillStyle = "#4b6276";
    ctx.textAlign = "center";
    ctx.fillText("No readings in this view", width / 2, height / 2);
    canvas.setAttribute("aria-label", metric.label + ". No readings in this view.");
    return;
  }
  const max = Math.max(metric.max, ...available.map(item => item[name]));
  const left = 45, right = width - 23, bottom = 169, top = 20;
  const start = dates[0].date.getTime(), end = dates.at(-1).date.getTime();
  const x = date => start === end ? (left + right) / 2 : left + (right - left) * (date - start) / (end - start);
  const y = value => bottom - (bottom - top) * value / max;
  if (metric.band && config) {
    const [low, high] = config[metric.band];
    ctx.fillStyle = "#def2ec";
    ctx.fillRect(left, y(high), right - left, y(low) - y(high));
  }
  for (let i = 0; i <= 4; i++) {
    const value = i * max / 4;
    ctx.strokeStyle = "#dce6ed";
    ctx.beginPath(); ctx.moveTo(left, y(value)); ctx.lineTo(right, y(value)); ctx.stroke();
    ctx.fillStyle = "#4b6276"; ctx.textAlign = "right";
    ctx.fillText(Number(value.toFixed(1)).toString(), left - 7, y(value) + 4);
  }
  ctx.fillText(metric.unit, left - 7, 10);
  ctx.strokeStyle = "#137f83"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  let continuing = false;
  dates.forEach(item => {
    if (item[name] === null) { continuing = false; return; }
    if (continuing) ctx.lineTo(x(item.date), y(item[name]));
    else ctx.moveTo(x(item.date), y(item[name]));
    continuing = true;
  });
  ctx.stroke();
  for (const item of available) {
    ctx.fillStyle = item.source === "sim" ? "#b35f15" : "#137f83";
    ctx.beginPath(); ctx.arc(x(item.date), y(item[name]), 4.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#4b6276";
  ctx.textAlign = start === end ? "center" : "left";
  ctx.fillText(shortDate.format(start), x(start), 191);
  if (start !== end) {
    ctx.textAlign = "right";
    ctx.fillText(shortDate.format(end), right, 191);
  }
  canvas.setAttribute("aria-label", metric.label + " (" + metric.unit + "). " +
    available.map(item => shortDate.format(item.date) + " " + Number(item[name].toFixed(2))).join(", "));
}
function showDetail(item, focus = true) {
  selected = item.id;
  $("detail").hidden = false;
  $("detail-title").textContent = "Repetitions · " + timestamp.format(item.date);
  $("detail-summary").textContent = item.count + " repetitions · " + item.target.toFixed(0) + "% on target";
  const table = $("details");
  table.replaceChildren();
  item.reps.forEach((rep, index) => {
    const row = table.insertRow();
    const result = document.createElement("span");
    result.className = rep.onTarget ? "pill good" : "pill miss";
    result.textContent = rep.onTarget ? "On target" : "Outside target";
    [String(index + 1), rep.height.toFixed(2) + " cm", rep.pace.toFixed(2) + " s",
      rep.speed.toFixed(2) + " cm/s", result].forEach(value => cell(row, value));
  });
  if (focus) $("detail-title").focus();
}
function render() {
  const days = Number($("range").value), source = $("source").value;
  filtered = sessions.filter(item => (!days || Date.now() - item.date <= days * 86400000) && (source === "all" || item.source === source));
  const allReps = filtered.flatMap(item => item.reps);
  $("session-count").textContent = filtered.length;
  $("rep-count").textContent = allReps.length + " completed repetitions";
  $("avg-height").textContent = allReps.length ? mean(allReps.map(rep => rep.height)).toFixed(2) + " cm" : "—";
  $("avg-pace").textContent = allReps.length ? mean(allReps.map(rep => rep.pace)).toFixed(2) + " s" : "—";
  $("target-rate").textContent = allReps.length ? percent(allReps).toFixed(0) + "%" : "—";
  const table = $("sessions");
  table.replaceChildren();
  if (!filtered.length) messageRow(table, 7, "No sessions match these filters.");
  filtered.forEach(item => {
    const row = table.insertRow(), button = document.createElement("button");
    button.type = "button";
    button.className = "date-link";
    button.dataset.session = item.id;
    button.textContent = timestamp.format(item.date);
    button.onclick = () => showDetail(item);
    [button, item.source === "sample" ? "Sample history" : "Simulator", item.count + " / " + config.goal,
      item.height.toFixed(2) + " ± " + item.consistency.toFixed(2) + " cm",
      item.pace.toFixed(2) + " ± " + item.paceConsistency.toFixed(2) + " s",
      item.target.toFixed(0) + "%", item.pain === null ? "—" : String(item.pain)].forEach(value => cell(row, value));
  });
  const active = filtered.find(item => item.id === selected);
  if (active) showDetail(active, false);
  else { selected = null; $("detail").hidden = true; }
  drawTrend();
}
async function load() {
  const id = ++request;
  $("status").textContent = "Loading sessions…";
  try {
    const [{config: settings, browserOnly}, records] = await Promise.all([demoData.config(), demoData.sessions()]);
    if (id !== request) return;
    config = settings;
    $("storage-note").hidden = !browserOnly;
    sessions = records.map(describe);
    $("height-reference").textContent = "Target " + config.height.join("–") + " cm";
    $("pace-reference").textContent = "Target " + config.pace.join("–") + " s";
    render();
    $("status").textContent = "Updated " + new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"});
  } catch {
    if (id === request) $("status").textContent = "Could not load sessions. Try Refresh data.";
  }
}
$("close-detail").onclick = () => {
  [...document.querySelectorAll(".date-link")].find(button => button.dataset.session === selected)?.focus();
  selected = null;
  $("detail").hidden = true;
};
$("range").onchange = render;
$("source").onchange = render;
$("metric").onchange = drawTrend;
$("refresh").onclick = load;
window.addEventListener("resize", drawTrend);
window.addEventListener("pageshow", load);
