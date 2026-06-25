import type { IUploadIndexRepo, UploadRecord } from '../types';

export interface RefIndexContext {
	getUpload: (cloudKey: string) => UploadRecord | undefined;
	getAllUploads: () => UploadRecord[];
	findByPublicUrl: (url: string) => UploadRecord | undefined;
	findByLocalPath: (path: string) => UploadRecord | undefined;
	resolveLinkTarget: (target: string, sourcePath: string) => string | undefined;
}

function normalizeUrl(url: string): string {
	try {
		return decodeURIComponent(url);
	} catch {
		return url;
	}
}

function basename(path: string): string {
	return path.split('/').pop() ?? path;
}

export function extractCloudKeysFromMarkdown(
	content: string,
	sourcePath: string,
	ctx: RefIndexContext,
): string[] {
	const keys = new Set<string>();
	const wikiRe = /!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
	let m: RegExpExecArray | null;
	while ((m = wikiRe.exec(content)) !== null) {
		const target = (m[1] ?? m[2] ?? '').trim();
		const key = ctx.resolveLinkTarget(target, sourcePath);
		if (key) keys.add(key);
	}
	const mdRe = /!\[[^\]]*\]\(([^)]+)\)/g;
	while ((m = mdRe.exec(content)) !== null) {
		const target = normalizeUrl(m[1]!.trim());
		const key = resolveTarget(target, sourcePath, ctx);
		if (key) keys.add(key);
	}
	const htmlRe = /<img[^>]+src=["']([^"']+)["']/gi;
	while ((m = htmlRe.exec(content)) !== null) {
		const target = normalizeUrl(m[1]!.trim());
		const key = resolveTarget(target, sourcePath, ctx);
		if (key) keys.add(key);
	}
	return [...keys];
}

function resolveTarget(
	target: string,
	sourcePath: string,
	ctx: RefIndexContext,
): string | undefined {
	if (target.startsWith('http://') || target.startsWith('https://')) {
		const rec = ctx.findByPublicUrl(target);
		return rec?.cloudKey;
	}
	return ctx.resolveLinkTarget(target, sourcePath);
}

export function extractCloudKeysFromCanvas(
	content: string,
	ctx: RefIndexContext,
): string[] {
	const keys = new Set<string>();
	try {
		const data = JSON.parse(content) as {
			nodes?: { type?: string; file?: string; url?: string }[];
		};
		for (const node of data.nodes ?? []) {
			if (node.file) {
				const rec = ctx.findByLocalPath(node.file);
				if (rec) keys.add(rec.cloudKey);
			}
			if (node.url) {
				const rec = ctx.findByPublicUrl(normalizeUrl(node.url));
				if (rec) keys.add(rec.cloudKey);
			}
		}
	} catch {
		// invalid canvas json
	}
	return [...keys];
}

export function extractCloudKeys(
	path: string,
	content: string,
	ctx: RefIndexContext,
): string[] {
	if (path.endsWith('.canvas')) {
		return extractCloudKeysFromCanvas(content, ctx);
	}
	return extractCloudKeysFromMarkdown(content, path, ctx);
}

export function createRefIndexContext(
	index: IUploadIndexRepo,
): RefIndexContext {
	return {
		getUpload: (k) => index.getUpload(k),
		getAllUploads: () => index.getAllUploads(),
		findByPublicUrl: (url) => {
			const n = normalizeUrl(url);
			return index.getAllUploads().find((r) => r.publicUrl === n || r.publicUrl === url);
		},
		findByLocalPath: (path) => index.findByLocalPath(path),
		resolveLinkTarget: (target, sourcePath) => {
			const direct = index.findByLocalPath(target);
			if (direct) return direct.cloudKey;
			const sourceDir = sourcePath.includes('/')
				? sourcePath.slice(0, sourcePath.lastIndexOf('/'))
				: '';
			const resolved = sourceDir ? `${sourceDir}/${target}` : target;
			const rec = index.findByLocalPath(resolved);
			if (rec) return rec.cloudKey;
			const byBase = index
				.getAllUploads()
				.find(
					(r) =>
						basename(r.localPath ?? '') === target ||
						r.localPaths?.some((p) => basename(p) === target),
				);
			return byBase?.cloudKey;
		},
	};
}

export function setsEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	const sa = [...a].sort();
	const sb = [...b].sort();
	return sa.every((v, i) => v === sb[i]);
}
