import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = join(here, '..', 'app', 'src', 'styles', 'theme.css');

function extractBlock(css, marker) {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`Block not found: ${marker}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`Unclosed block: ${marker}`);
}

function parseTokens(block) {
  const tokens = new Map();
  const pattern = /--color-([a-z0-9-]+):\s*([^;]+);/g;
  let match = pattern.exec(block);
  while (match) {
    tokens.set(match[1], match[2].trim());
    match = pattern.exec(block);
  }
  return tokens;
}

function parseHex(value) {
  const hex = value.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((character) => character + character)
          .join('')
      : hex;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
    a: 1,
  };
}

function parseRgba(value) {
  const match = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function parseColor(value, tokens) {
  const trimmed = value.trim();
  if (trimmed.startsWith('var(')) {
    const name = trimmed.slice(4, -1).trim().replace('--color-', '');
    if (!tokens.has(name)) throw new Error(`Unknown token reference: ${value}`);
    return parseColor(tokens.get(name), tokens);
  }
  if (trimmed.startsWith('#')) return parseHex(trimmed);
  if (trimmed.startsWith('rgb')) return parseRgba(trimmed);
  throw new Error(`Unsupported color: ${value}`);
}

function over(foreground, background) {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

function withAlpha(color, alpha) {
  return { ...color, a: color.a * alpha };
}

function relativeLuminance({ r, g, b }) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function verdict(ratio, threshold) {
  return ratio >= threshold ? 'PASS' : 'FAIL';
}

function formatRatio(ratio) {
  return ratio.toFixed(2);
}

function formatColor(color) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

const solid = ['bg', 'surface', 'surface-elevated'];
const soft = ['primary-soft', 'rain-soft', 'success-soft', 'warning-soft', 'danger-soft'];
const inks = ['primary-ink', 'rain-ink', 'success-ink', 'warning-ink', 'danger-ink'];

const PAIRS = [];

for (const token of [
  'text',
  'text-secondary',
  'text-muted',
  'primary-ink',
  'rain-ink',
  'success-ink',
  'warning-ink',
  'danger-ink',
]) {
  for (const background of solid) {
    PAIRS.push({ fg: token, bg: background, use: 'text' });
  }
}

for (const ink of inks) {
  const softToken = ink.replace('-ink', '-soft');
  for (const under of ['bg', 'surface']) {
    PAIRS.push({ fg: ink, bg: softToken, under, use: 'text on soft' });
  }
}

for (const token of ['text', 'text-secondary', 'text-muted']) {
  PAIRS.push({ fg: token, bg: 'primary-soft', under: 'surface', use: 'leaderboard me row' });
}

PAIRS.push({ fg: 'on-accent', bg: 'primary', use: 'button primary' });
PAIRS.push({ fg: 'text', bg: 'surface-elevated', use: 'button secondary' });
PAIRS.push({ fg: 'text-secondary', bg: 'bg', use: 'button ghost' });
PAIRS.push({ fg: 'danger-ink', bg: 'danger-soft', under: 'surface', use: 'button danger' });
PAIRS.push({ fg: 'text-muted', bg: 'surface', use: 'section label / caption' });
PAIRS.push({ fg: 'text-muted', bg: 'bg', use: 'section label / caption' });
PAIRS.push({ fg: 'text-muted', bg: 'surface-elevated', use: 'section label / caption' });

const RING_PAIRS = solid.map((under) => ({ fg: 'primary', alpha: 0.6, under, use: 'focus ring' }));

const css = readFileSync(CSS_PATH, 'utf8');
const baseTokens = parseTokens(extractBlock(css, '@theme static'));
const darkTokens = new Map([...baseTokens, ...parseTokens(extractBlock(css, "[data-theme='dark']"))]);
const lightTokens = new Map([...baseTokens, ...parseTokens(extractBlock(css, "[data-theme='light']"))]);
const themes = [
  { name: 'dark', tokens: darkTokens },
  { name: 'light', tokens: lightTokens },
];

const rows = [];
let textFailures = 0;
let ringFailures = 0;

for (const theme of themes) {
  const { tokens } = theme;
  const resolved = new Map();
  for (const [name, value] of tokens) {
    resolved.set(name, parseColor(value, tokens));
  }
  const solidColor = (name) => resolved.get(name);

  for (const pair of PAIRS) {
    const foreground = resolved.get(pair.fg);
    if (!foreground) continue;
    const background = pair.under ? over(resolved.get(pair.bg), solidColor(pair.under)) : solidColor(pair.bg);
    const ratio = contrastRatio(over(foreground, background), background);
    const normal = verdict(ratio, 4.5);
    const large = verdict(ratio, 3);
    const label = `${pair.fg} on ${pair.bg}${pair.under ? ` (over ${pair.under})` : ''}`;
    if (normal === 'FAIL') textFailures += 1;
    rows.push({
      theme: theme.name,
      pair: label,
      use: pair.use,
      ratio: formatRatio(ratio),
      normal,
      aaa: verdict(ratio, 7),
      large,
      sample: formatColor(over(foreground, background)),
    });
  }

  for (const pair of RING_PAIRS) {
    const ring = withAlpha(resolved.get(pair.fg), pair.alpha);
    const background = solidColor(pair.under);
    const ratio = contrastRatio(over(ring, background), background);
    const pass = verdict(ratio, 3);
    if (pass === 'FAIL') ringFailures += 1;
    rows.push({
      theme: theme.name,
      pair: `focus ring primary/60 on ${pair.under}`,
      use: pair.use,
      ratio: formatRatio(ratio),
      normal: 'n/a',
      aaa: 'n/a',
      large: pass,
      sample: formatColor(over(ring, background)),
    });
  }
}

console.log('| Theme | Pair | Usage | Ratio | AA 4.5 | AAA 7.0 | Large 3.0 |');
console.log('| ----- | ---- | ----- | ----- | ------ | ------- | --------- |');
for (const row of rows) {
  console.log(`| ${row.theme} | ${row.pair} | ${row.use} | ${row.ratio} | ${row.normal} | ${row.aaa} | ${row.large} |`);
}
console.log('');
console.log(`Pairs: ${rows.length}. Text failures: ${textFailures}. Focus ring failures: ${ringFailures}.`);
process.exitCode = textFailures > 0 ? 1 : 0;
