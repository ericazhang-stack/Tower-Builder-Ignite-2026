"use strict";

const demoData = (() => {
  const fallbackConfig = {height: [6, 7], pace: [3, 4], goal: 12};
  const prefix = "tower-builder:session:";
  const api = "./api/";
  let settings;

  function config() {
    settings ??= fetch(api + "config", {cache: "no-store"}).then(async response => {
      if (response.status === 404) return {config: fallbackConfig, browserOnly: true};
      if (!response.ok) throw new Error("Cannot load demo settings.");
      const data = await response.json();
      return {config: data, browserOnly: data.storage === "browser"};
    }).catch(error => {
      settings = null;
      throw error;
    });
    return settings;
  }

  function score({height, pace}, ranges) {
    return {height, pace, speed: Math.round(height / pace * 100) / 100,
      onTarget: height >= ranges.height[0] && height <= ranges.height[1] &&
        pace >= ranges.pace[0] && pace <= ranges.pace[1]};
  }

  function sampleSessions(ranges) {
    const samples = [];
    const round = value => Math.round(value * 100) / 100;
    const now = new Date();
    for (let week = 0; week < 5; week++) {
      for (let visit = 0; visit < 2; visit++) {
        const date = new Date(now);
        date.setDate(now.getDate() - (31 - week * 7 - visit * 2));
        const reps = Array.from({length: Math.min(ranges.goal, 9 + Math.min(week, 3))}, (_, rep) => score({
          height: round(5.65 + week * .19 + visit * .1 + Math.sin(rep * 2) * .55),
          pace: round(2.65 + week * .19 + Math.cos(rep * 3) * .47)
        }, ranges));
        samples.push({id: "sample-" + week + "-" + visit, recorded: date.toISOString(),
          pain: Math.max(1, 5 - week), reps});
      }
    }
    return samples;
  }

  async function sessions() {
    const {config: ranges, browserOnly} = await config();
    if (!browserOnly) {
      const response = await fetch(api + "sessions", {cache: "no-store"});
      if (!response.ok) throw new Error("Cannot load demo sessions.");
      return response.json();
    }
    const records = sampleSessions(ranges);
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(prefix)) continue;
      const saved = localStorage.getItem(key);
      if (saved) records.push(JSON.parse(saved));
    }
    return records.sort((a, b) => b.recorded.localeCompare(a.recorded));
  }

  async function save(session) {
    const {config: ranges, browserOnly} = await config();
    if (!browserOnly) {
      const response = await fetch(api + "sessions", {method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify(session)});
      if (!response.ok) throw new Error("Cannot save demo session.");
      return;
    }
    const key = prefix + session.id;
    if (localStorage.getItem(key) !== null) return;
    const record = {...session, recorded: new Date().toISOString(), reps: session.reps.map(rep => score(rep, ranges))};
    localStorage.setItem(key, JSON.stringify(record));
  }

  return {config, sessions, save};
})();
