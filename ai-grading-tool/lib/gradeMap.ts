import { promises as fs } from 'fs';
import path from 'path';

type Range = { letter: string; from: number; to: number };
let cached: Range[] | null = null;

function parseCsv(data: string): Range[] {
  const lines = data.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Range[] = [];
  for (const line of lines.slice(1)) { // skip header
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length < 3) continue;
    const letter = parts[0];
    const to = Number(parts[1]);
    const from = Number(parts[2]);
    if (!letter || !Number.isFinite(from) || !Number.isFinite(to)) continue;
    out.push({ letter, from, to });
  }
  // keep in descending 'to' order for search
  return out.sort((a, b) => b.to - a.to);
}

export async function loadGradeMap(): Promise<Range[]> {
  if (cached) return cached;
  // CSV located at project root csv_exports/Grading_Map.csv
  const p = path.join(process.cwd(), 'csv_exports', 'Grading_Map.csv');
  try {
    const raw = await fs.readFile(p, 'utf-8');
    const topSection = raw.split(/\r?\n/).slice(0, 12).join('\n'); // first table (Grade, To, From)
    cached = parseCsv(topSection);
  } catch {
    // fallback defaults if file missing
    cached = [
      { letter: 'A+', from: 30, to: 33 },
      { letter: 'A', from: 27, to: 29 },
      { letter: 'A-', from: 24, to: 26 },
      { letter: 'B+', from: 21, to: 23 },
      { letter: 'B', from: 18, to: 20 },
      { letter: 'B-', from: 15, to: 17 },
      { letter: 'C', from: 12, to: 14 },
      { letter: 'C-', from: 6, to: 11 },
      { letter: 'D', from: 3, to: 5 },
      { letter: 'F', from: 0, to: 2 },
    ];
  }
  return cached!;
}

export async function letterFromTotal(total: number): Promise<{ letter: string; from: number; to: number } | null> {
  if (!Number.isFinite(total)) return null;
  const ranges = await loadGradeMap();
  // Use descending 'from' thresholds to avoid off-by-decimal issues on 'to' boundaries.
  const sorted = [...ranges].sort((a, b) => b.from - a.from);
  const EPS = 1e-6;
  for (const r of sorted) {
    if (total + EPS >= r.from) return r;
  }
  return null;
}


