import { App, Modal } from 'obsidian';
import type { AppContext } from '../app-context';

export class DuplicatesModal extends Modal {
	constructor(
		app: App,
		private ctx: AppContext,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Duplicate cloud files' });
		const groups = this.ctx.reference.findDuplicateGroups();
		if (!groups.length) {
			contentEl.createEl('p', { text: 'No duplicate content hashes found.' });
			return;
		}
		for (const g of groups) {
			const block = contentEl.createDiv({ cls: 'cloud-attachment-dup-group' });
			block.createEl('p', {
				text: `Hash ${g.contentHash.slice(0, 12)}… — wasted ${g.wastedBytes} bytes`,
			});
			const ul = block.createEl('ul');
			for (const rec of g.records) {
				const li = ul.createEl('li');
				li.setText(`${rec.cloudKey} (${rec.size} bytes)`);
				const del = li.createEl('button', { text: 'Delete' });
				del.onclick = () => {
					void this.ctx.storage.deleteFromCloud(rec.cloudKey);
				};
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
