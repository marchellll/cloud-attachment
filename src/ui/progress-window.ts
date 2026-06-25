import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { AppContext } from '../app-context';
import type { UploadProgress } from '../types';

export const PROGRESS_VIEW_TYPE = 'cloud-attachment-progress';

let activeCtx: AppContext | null = null;
let progressItems: UploadProgress[] = [];

export function openProgressWindow(ctx: AppContext): void {
	activeCtx = ctx;
	ctx.upload.setProgressCallback((items) => {
		progressItems = items;
		updateOpenProgressViews();
	});
	const leaf = ctx.app.workspace.getLeaf('window');
	void leaf.setViewState({ type: PROGRESS_VIEW_TYPE, active: true });
}

function updateOpenProgressViews(): void {
	const leaves = activeCtx?.app.workspace.getLeavesOfType(PROGRESS_VIEW_TYPE) ?? [];
	for (const leaf of leaves) {
		const view = leaf.view;
		if (view instanceof ProgressView) {
			view.render(progressItems);
		}
	}
}

export class ProgressView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return PROGRESS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Cloud upload progress';
	}

	getIcon(): string {
		return 'upload-cloud';
	}

	async onOpen(): Promise<void> {
		this.render(progressItems);
	}

	render(items: UploadProgress[]): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cloud-attachment-progress');
		if (!items.length) {
			contentEl.createEl('p', { text: 'No upload in progress.' });
			return;
		}
		for (const item of items) {
			const row = contentEl.createDiv({ cls: 'cloud-attachment-progress-row' });
			row.createEl('span', {
				cls: `cloud-attachment-status-${item.status}`,
				text: item.status,
			});
			row.createEl('span', { text: item.filePath });
			if (item.percent !== undefined) {
				row.createEl('span', { text: ` ${item.percent}%` });
			}
			if (item.message) {
				row.createEl('div', {
					cls: 'cloud-attachment-progress-detail',
					text: item.message,
				});
			}
		}
	}
}
