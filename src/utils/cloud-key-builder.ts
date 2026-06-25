import { uuidv7 } from 'uuidv7';

export function buildCloudKey(
	originalName: string,
	enabled: boolean,
	now = new Date(),
): string {
	const sanitized = originalName
		.replace(/[/\\]/g, '_')
		.replace(/\s+/g, '_');
	if (!enabled) {
		return sanitized;
	}
	const yyyy = String(now.getFullYear());
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	return `${yyyy}/${mm}/${dd}/${uuidv7()}-${sanitized}`;
}

export function buildPublicUrl(baseUrl: string, cloudKey: string): string {
	const base = baseUrl.replace(/\/+$/, '');
	const key = cloudKey.replace(/^\/+/, '');
	const encoded = key.split('/').map(encodeURIComponent).join('/');
	return `${base}/${encoded}`;
}
