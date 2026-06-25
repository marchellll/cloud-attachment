import type { App } from 'obsidian';

export function getConfiguredAttachmentFolder(app: App): string {
	const af = (app.vault as { getConfig?: (k: string) => string }).getConfig?.(
		'attachmentFolderPath',
	);
	if (!af || af === '/') {
		return '';
	}
	if (af === './') {
		return '';
	}
	return af.replace(/\/$/, '');
}

export function resolveAttachmentPathForFile(
	app: App,
	sourcePath: string,
	attachmentName: string,
): string {
	const folder = getConfiguredAttachmentFolder(app);
	if (!folder) {
		const dir = sourcePath.includes('/')
			? sourcePath.slice(0, sourcePath.lastIndexOf('/'))
			: '';
		return dir ? `${dir}/${attachmentName}` : attachmentName;
	}
	if (folder.startsWith('./')) {
		const sub = folder.slice(2);
		const dir = sourcePath.includes('/')
			? sourcePath.slice(0, sourcePath.lastIndexOf('/'))
			: '';
		return dir ? `${dir}/${sub}/${attachmentName}` : `${sub}/${attachmentName}`;
	}
	return `${folder}/${attachmentName}`;
}
