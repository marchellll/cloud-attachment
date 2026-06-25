import type { App } from 'obsidian';
import { resolveAttachmentPathForFile } from './attachment-paths';

function basename(path: string): string {
	return path.split('/').pop() ?? path;
}

function isRemote(target: string): boolean {
	return /^https?:\/\//i.test(target);
}

export function extractLocalAttachmentPaths(
	app: App,
	sourcePath: string,
	content: string,
): string[] {
	const paths = new Set<string>();
	const sourceDir = sourcePath.includes('/')
		? sourcePath.slice(0, sourcePath.lastIndexOf('/'))
		: '';

	const wikiRe = /!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
	let m: RegExpExecArray | null;
	while ((m = wikiRe.exec(content)) !== null) {
		const target = (m[1] ?? m[2] ?? '').trim();
		if (!target || isRemote(target)) continue;
		const resolved = resolveLocalPath(sourceDir, target, sourcePath, app);
		if (resolved) paths.add(resolved);
	}

	const mdRe = /!\[[^\]]*\]\(([^)]+)\)/g;
	while ((m = mdRe.exec(content)) !== null) {
		const target = m[1]!.trim();
		if (!target || isRemote(target)) continue;
		const resolved = resolveLocalPath(sourceDir, target, sourcePath, app);
		if (resolved) paths.add(resolved);
	}

	if (sourcePath.endsWith('.canvas')) {
		try {
			const data = JSON.parse(content) as {
				nodes?: { file?: string }[];
			};
			for (const node of data.nodes ?? []) {
				if (node.file && !isRemote(node.file)) {
					paths.add(node.file);
				}
			}
		} catch {
			// ignore
		}
	}

	return [...paths];
}

function resolveLocalPath(
	sourceDir: string,
	target: string,
	sourcePath: string,
	app: App,
): string | undefined {
	if (target.startsWith('/')) {
		return target.slice(1);
	}
	if (target.includes('/')) {
		return sourceDir ? `${sourceDir}/${target}` : target;
	}
	const byName = resolveAttachmentPathForFile(app, sourcePath, target);
	if (app.vault.getAbstractFileByPath(byName)) return byName;
	if (sourceDir) {
		const sibling = `${sourceDir}/${target}`;
		if (app.vault.getAbstractFileByPath(sibling)) return sibling;
	}
	const files = app.vault.getFiles().filter((f) => f.name === basename(target));
	if (files.length === 1) return files[0]!.path;
	return byName;
}
