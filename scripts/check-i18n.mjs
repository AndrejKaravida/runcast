import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'app', 'src', 'i18n', 'locales');
const configPath = join(root, 'app', 'src', 'i18n', 'config.ts');
const locales = ['sr', 'en'];
const reference = locales[0];

const config = readFileSync(configPath, 'utf8');
const namespacesBlock = config.match(/export const NAMESPACES\s*=\s*\[([\s\S]*?)\]/);
if (!namespacesBlock) throw new Error(`NAMESPACES array not found in ${configPath}`);
const registered = [...namespacesBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);

const filesByLocale = new Map(
  locales.map((locale) => [
    locale,
    new Set(readdirSync(join(localesDir, locale)).map((file) => file.replace(/\.json$/, ''))),
  ]),
);

const problems = [];
const seen = new Set();

function addProblem(problem, namespace, key, detail) {
  const id = [problem, namespace, key, detail].join('|');
  if (seen.has(id)) return;
  seen.add(id);
  problems.push({ problem, namespace, key, detail });
}

function kindOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function flatten(value, prefix = '') {
  const entries = new Map();
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      for (const [childPath, childValue] of flatten(child, path)) entries.set(childPath, childValue);
    }
    return entries;
  }
  entries.set(prefix, value);
  return entries;
}

function placeholders(value) {
  const names = new Set();
  for (const match of value.matchAll(/\{\{\s*([^,}]+?)\s*(?:,[^}]*)?\}\}/g)) names.add(match[1]);
  return [...names].sort();
}

for (const locale of locales) {
  for (const namespace of registered) {
    if (!filesByLocale.get(locale).has(namespace)) {
      addProblem('missing namespace file', namespace, '', `locales/${locale}/${namespace}.json does not exist`);
    }
  }
  for (const namespace of filesByLocale.get(locale)) {
    if (!registered.includes(namespace)) {
      addProblem('unregistered namespace', namespace, '', `locales/${locale}/${namespace}.json is not in NAMESPACES`);
    }
  }
}

const namespaceTable = registered.map((namespace) => ({
  Namespace: namespace,
  sr: filesByLocale.get('sr').has(namespace) ? 'present' : 'missing',
  en: filesByLocale.get('en').has(namespace) ? 'present' : 'missing',
  Registered: filesByLocale.get('sr').has(namespace) && filesByLocale.get('en').has(namespace) ? 'yes' : 'no',
}));

const trees = new Map();
for (const locale of locales) {
  for (const namespace of registered) {
    if (!filesByLocale.get(locale).has(namespace)) continue;
    const path = join(localesDir, locale, `${namespace}.json`);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      addProblem('invalid json', namespace, '', `${locale}: ${error.message}`);
      continue;
    }
    trees.set(`${locale}:${namespace}`, flatten(parsed));
  }
}

for (const namespace of registered) {
  const referenceTree = trees.get(`${reference}:${namespace}`);
  const compareTree = trees.get(`${locales[1]}:${namespace}`);
  if (!referenceTree || !compareTree) continue;
  const keys = new Set([...referenceTree.keys(), ...compareTree.keys()]);
  for (const key of [...keys].sort()) {
    const referenceValue = referenceTree.get(key);
    const compareValue = compareTree.get(key);
    if (!referenceTree.has(key)) {
      addProblem(`missing in ${reference}`, namespace, key, `${locales[1]} has "${compareValue}"`);
      continue;
    }
    if (!compareTree.has(key)) {
      addProblem(`missing in ${locales[1]}`, namespace, key, `${reference} has "${referenceValue}"`);
      continue;
    }
    if (kindOf(referenceValue) !== kindOf(compareValue)) {
      addProblem(
        'type mismatch',
        namespace,
        key,
        `${reference}=${kindOf(referenceValue)} ${locales[1]}=${kindOf(compareValue)}`,
      );
      continue;
    }
    if (typeof referenceValue === 'string' && referenceValue.trim() === '')
      addProblem('empty string', namespace, key, reference);
    if (typeof compareValue === 'string' && compareValue.trim() === '')
      addProblem('empty string', namespace, key, locales[1]);
    if (typeof referenceValue === 'string' && typeof compareValue === 'string') {
      const referencePlaceholders = placeholders(referenceValue);
      const comparePlaceholders = placeholders(compareValue);
      if (referencePlaceholders.join(',') !== comparePlaceholders.join(',')) {
        addProblem(
          'placeholder mismatch',
          namespace,
          key,
          `${reference}=[${referencePlaceholders.join(', ')}] ${locales[1]}=[${comparePlaceholders.join(', ')}]`,
        );
      }
    }
  }
}

console.log('| Namespace | sr | en | Registered |');
console.log('| --------- | -- | -- | ---------- |');
for (const row of namespaceTable) {
  console.log(`| ${row.Namespace} | ${row.sr} | ${row.en} | ${row.Registered} |`);
}
console.log('');

if (problems.length > 0) {
  console.log('| Problem | Namespace | Key | Detail |');
  console.log('| ------- | --------- | --- | ------ |');
  for (const problem of problems) {
    console.log(`| ${problem.problem} | ${problem.namespace} | ${problem.key} | ${problem.detail} |`);
  }
  console.log('');
}

console.log(
  `Namespaces: ${registered.length} registered, ${filesByLocale.get('sr').size} sr files, ${filesByLocale.get('en').size} en files. Problems: ${problems.length}.`,
);
process.exitCode = problems.length > 0 ? 1 : 0;
