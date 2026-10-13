import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDirs = [rootDir, path.join(rootDir, 'app'), path.join(rootDir, 'packages', 'shared')];
const outputPath = path.join(rootDir, 'app', 'src', 'features', 'legal', 'licenses.json');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function resolvePackageDir(name, fromDir) {
  let dir = fromDir;
  while (true) {
    const candidate = path.join(dir, 'node_modules', name);
    if (existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (dir === rootDir) return null;
    dir = path.dirname(dir);
  }
}

function licenseOf(manifest) {
  const value = manifest.license ?? manifest.licenses;
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (Array.isArray(value)) {
    const types = value
      .map((entry) => (typeof entry === 'string' ? entry : entry?.type))
      .filter((type) => typeof type === 'string' && type.trim().length > 0);
    return types.length > 0 ? types.join(' OR ') : 'UNKNOWN';
  }
  if (value && typeof value.type === 'string' && value.type.trim().length > 0) return value.type;
  return 'UNKNOWN';
}

function repositoryUrl(manifest) {
  const repository = manifest.repository;
  const raw = (typeof repository === 'string' ? repository : repository?.url) ?? manifest.homepage;
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const shorthand = raw.trim().replace(/^github:/, '');
  if (/^[\w.-]+\/[\w.-]+$/.test(shorthand)) return `https://github.com/${shorthand}`;
  return shorthand.replace(/^git\+/, '').replace(/\.git$/, '');
}

const packages = new Map();
for (const workspaceDir of workspaceDirs) {
  const manifest = readJson(path.join(workspaceDir, 'package.json'));
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    const packageDir = resolvePackageDir(name, workspaceDir);
    if (!packageDir) {
      throw new Error(`Cannot resolve ${name} from ${path.relative(rootDir, workspaceDir) || '.'}`);
    }
    const installed = readJson(path.join(packageDir, 'package.json'));
    const resolvedName = installed.name ?? name;
    const resolvedVersion = installed.version ?? 'unknown';
    const key = `${resolvedName}@${resolvedVersion}`;
    if (packages.has(key)) continue;
    packages.set(key, {
      name: resolvedName,
      version: resolvedVersion,
      license: licenseOf(installed),
      url: repositoryUrl(installed),
    });
  }
}

const entries = [...packages.values()].sort((a, b) => {
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  if (a.version !== b.version) return a.version < b.version ? -1 : 1;
  return 0;
});

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Wrote ${entries.length} licenses to ${path.relative(rootDir, outputPath)}`);
