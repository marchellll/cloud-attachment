import type { App } from 'obsidian';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { AppContext } from '../app-context';
import { OrphanReviewModal } from './orphan-review-modal';

export const STORAGE_VIEW_TYPE = 'cloud-attachment-storage';

export async function activateStorageView(
	app: App,
	ctx: AppContext,
): Promise<void> {
	 
	const leaf = app.workspace.getRightLeaf(false);
	if (!leaf) return;
	await leaf.setViewState({ type: STORAGE_VIEW_TYPE, active: true });
	void app.workspace.revealLeaf(leaf);
	const view = leaf.view;
	if (view instanceof StorageView) {
		view.setContext(ctx);
	}
}

export class StorageView extends ItemView {
	private ctx: AppContext | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return STORAGE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Cloud storage';
	}

	getIcon(): string {
		return 'database';
	}

	setContext(ctx: AppContext): void {
		this.ctx = ctx;
		void this.refresh();
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cloud-attachment-storage');
		if (!this.ctx) {
			contentEl.createEl('p', { text: 'Loading…' });
			return;
		}
		const header = contentEl.createDiv({ cls: 'cloud-attachment-storage-header' });
		header.createEl('h4', { text: 'Uploaded files' });
		const syncBtn = header.createEl('button', { text: 'Sync from bucket' });
		syncBtn.onclick = () => {
			void this.ctx?.storage.syncFromBucket().then(() => void this.refresh());
		};
		const orphanBtn = header.createEl('button', { text: 'Review orphans' });
		orphanBtn.onclick = () => {
			if (this.ctx) {
				new OrphanReviewModal(this.app, this.ctx).open();
			}
		};

		const records = this.ctx.storage.list();
		if (!records.length) {
			contentEl.createEl('p', { text: 'No uploads indexed yet.' });
			return;
		}
		const table = contentEl.createEl('table');
		const thead = table.createEl('thead');
		const hr = thead.createEl('tr');
		for (const col of ['Key', 'Size', 'Refs', 'Actions']) {
			hr.createEl('th', { text: col });
		}
		const tbody = table.createEl('tbody');
		for (const rec of records) {
			const tr = tbody.createEl('tr');
			tr.createEl('td', { text: rec.cloudKey });
			tr.createEl('td', { text: String(rec.size) });
			tr.createEl('td', { text: String(rec.refCount) });
			const actions = tr.createEl('td');
			const del = actions.createEl('button', { text: 'Delete' });
			del.onclick = () => {
				void this.ctx
					?.storage.deleteFromCloud(rec.cloudKey)
					.then(() => void this.refresh());
			};
			const dl = actions.createEl('button', { text: 'Download' });
			dl.onclick = () => {
				const dest = rec.localPath ?? rec.cloudKey.split('/').pop() ?? rec.cloudKey;
				void this.ctx?.storage.downloadToVault(rec.cloudKey, dest);
			};
		}
	}
}
