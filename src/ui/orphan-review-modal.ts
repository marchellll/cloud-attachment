import { App, Modal } from 'obsidian';
import type { AppContext } from '../app-context';

export class OrphanReviewModal extends Modal {
	constructor(
		app: App,
		private ctx: AppContext,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Orphan cloud files' });
		const orphans = this.ctx.reference.getOrphans();
		if (!orphans.length) {
			contentEl.createEl('p', { text: 'No orphans found.' });
			return;
		}
		for (const rec of orphans) {
			const row = contentEl.createDiv({ cls: 'cloud-attachment-orphan-row' });
			row.createEl('span', { text: rec.cloudKey });
			const del = row.createEl('button', { text: 'Delete from cloud' });
			del.onclick = () => {
				void this.ctx.storage.deleteFromCloud(rec.cloudKey);
			};
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
