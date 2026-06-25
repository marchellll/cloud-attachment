import ignore, { type Ignore } from 'ignore';
import { TFile, type App } from 'obsidian';

const cache = new Map<string, Ignore>();

function parentDir(path: string): string {
	const i = path.lastIndexOf('/');
	return i <= 0 ? '' : path.slice(0, i);
}

async function loadIgnoreForDir(
	app: App,
	dir: string,
): Promise<Ignore> {
	const key = dir || '/';
	if (cache.has(key)) {
		return cache.get(key)!;
	}
	const ig = ignore();
	const gitignorePath = dir ? `${dir}/.gitignore` : '.gitignore';
	const file = app.vault.getAbstractFileByPath(gitignorePath);
	if (file instanceof TFile) {
		const content = await app.vault.read(file);
		ig.add(content);
	}
	cache.set(key, ig);
	return ig;
}

export async function isGitignored(app: App, vaultPath: string): Promise<boolean> {
	let dir = parentDir(vaultPath);
	const igRoot = await loadIgnoreForDir(app, '');
	if (igRoot.ignores(vaultPath)) {
		return true;
	}
	while (dir) {
		const ig = await loadIgnoreForDir(app, dir);
		const rel = vaultPath.slice(dir.length + 1);
		if (ig.ignores(rel)) {
			return true;
		}
		dir = parentDir(dir);
	}
	return false;
}

export function clearGitignoreCache(): void {
	cache.clear();
}
