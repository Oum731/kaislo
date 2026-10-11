// Stockage en mémoire (développement et tests). Données persistées dans un fichier JSON si `file` est fourni.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
export function memoryDb(file) {
  let rows = [];   // { day, pid, name, ms, created }
  if (file && existsSync(file)) { try { rows = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { rows = []; } }
  const save = () => { if (file) try { writeFileSync(file, JSON.stringify(rows)); } catch (e) {} };
  return {
    async upsertBest(day, pid, name, ms) {
      const r = rows.find((x) => x.day === day && x.pid === pid);
      if (r) { r.name = name; if (ms < r.ms) r.ms = ms; } else rows.push({ day, pid, name, ms, created: Date.now() });
      save();
    },
    async getBest(day, pid) { const r = rows.find((x) => x.day === day && x.pid === pid); return r ? r.ms : 0; },
    async top(day, limit) { return rows.filter((x) => x.day === day).sort((a, b) => a.ms - b.ms || a.created - b.created).slice(0, limit); },
    async rankOf(day, ms) { return rows.filter((x) => x.day === day && x.ms < ms).length; },
    async count(day) { return rows.filter((x) => x.day === day).length; },
  };
}
