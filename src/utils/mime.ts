const MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	bmp: 'image/bmp',
	ico: 'image/x-icon',
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	ogg: 'audio/ogg',
	m4a: 'audio/mp4',
	mp4: 'video/mp4',
	webm: 'video/webm',
	mov: 'video/quicktime',
	avi: 'video/x-msvideo',
	mkv: 'video/x-matroska',
	pdf: 'application/pdf',
};

function extensionFromPath(path: string): string {
	return path.split('.').pop()?.toLowerCase() ?? '';
}

export function contentTypeFromPath(path: string): string {
	return MIME[extensionFromPath(path)] ?? 'application/octet-stream';
}

export function contentTypeFromBuffer(buf: ArrayBuffer): string | undefined {
	const b = new Uint8Array(buf);
	if (
		b.length >= 8 &&
		b[0] === 0x89 &&
		b[1] === 0x50 &&
		b[2] === 0x4e &&
		b[3] === 0x47
	) {
		return 'image/png';
	}
	if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
		return 'image/jpeg';
	}
	if (
		b.length >= 6 &&
		b[0] === 0x47 &&
		b[1] === 0x49 &&
		b[2] === 0x46
	) {
		return 'image/gif';
	}
	if (
		b.length >= 12 &&
		b[0] === 0x52 &&
		b[1] === 0x49 &&
		b[2] === 0x46 &&
		b[3] === 0x46 &&
		b[8] === 0x57 &&
		b[9] === 0x45 &&
		b[10] === 0x42 &&
		b[11] === 0x50
	) {
		return 'image/webp';
	}
	return undefined;
}

export function resolveContentType(path: string, buf: ArrayBuffer): string {
	const fromPath = contentTypeFromPath(path);
	if (fromPath !== 'application/octet-stream') return fromPath;
	return contentTypeFromBuffer(buf) ?? fromPath;
}

function extensionForContentType(contentType: string): string | undefined {
	for (const [ext, mime] of Object.entries(MIME)) {
		if (mime === contentType) return ext;
	}
	return undefined;
}

function hasKnownExtension(name: string): boolean {
	const ext = extensionFromPath(name);
	return ext !== name.toLowerCase() && ext in MIME;
}

export function ensureFileExtension(name: string, contentType: string): string {
	if (hasKnownExtension(name)) return name;
	const ext = extensionForContentType(contentType);
	return ext ? `${name}.${ext}` : name;
}
