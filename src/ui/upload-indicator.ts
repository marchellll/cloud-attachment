import type { Plugin } from 'obsidian';
import type { AppContext } from '../app-context';
import type { UploadProgress } from '../types';

let hideTimer: number | null = null;

export function registerUploadIndicator(plugin: Plugin, ctx: AppContext): void {
	const el = plugin.app.workspace.containerEl.createDiv(
		'cloud-attachment-upload-indicator',
	);
	el.hidden = true;

	plugin.register(() => {
		if (hideTimer) window.clearTimeout(hideTimer);
		el.remove();
	});

	ctx.upload.setProgressCallback((items) => {
		renderIndicator(el, items, ctx.upload.isUploading());
	});
}

function renderIndicator(
	el: HTMLDivElement,
	items: UploadProgress[],
	uploading: boolean,
): void {
	if (hideTimer) {
		window.clearTimeout(hideTimer);
		hideTimer = null;
	}

	if (!items.length) {
		el.hidden = true;
		return;
	}

	const active = items.filter(
		(i) => i.status === 'uploading' || i.status === 'pending',
	);
	const done = items.filter((i) => i.status === 'done').length;
	const failed = items.filter((i) => i.status === 'error').length;
	const skipped = items.filter((i) => i.status === 'skipped').length;
	const total = items.length;

	if (!uploading && !active.length) {
		el.hidden = false;
		el.empty();
		el.createDiv({
			cls: 'cloud-attachment-upload-indicator-title',
			text: 'Upload complete',
		});
		const parts: string[] = [];
		if (done) parts.push(`${done} uploaded`);
		if (skipped) parts.push(`${skipped} skipped`);
		if (failed) parts.push(`${failed} failed`);
		el.createDiv({
			cls: 'cloud-attachment-upload-indicator-summary',
			text: parts.join(', ') || 'Finished',
		});
		hideTimer = window.setTimeout(() => {
			el.hidden = true;
			hideTimer = null;
		}, 3000);
		return;
	}

	el.hidden = false;
	el.empty();

	const completed = done + skipped + failed;
	el.createDiv({
		cls: 'cloud-attachment-upload-indicator-title',
		text: `Uploading ${completed}/${total}`,
	});

	const current =
		items.find((i) => i.status === 'uploading') ??
		items.find((i) => i.status === 'pending');
	if (!current) return;

	const name = current.filePath.split('/').pop() ?? current.filePath;
	el.createDiv({
		cls: 'cloud-attachment-upload-indicator-file',
		text: name,
	});

	if (current.percent !== undefined) {
		const progress = el.createEl('progress', {
			cls: 'cloud-attachment-upload-indicator-bar',
		});
		progress.max = 100;
		progress.value = current.percent;
	}
}
