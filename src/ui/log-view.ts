import type { App } from 'obsidian';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { AppContext } from '../app-context';
import type { LogCategory, LogLevel } from '../types';

export const LOG_VIEW_TYPE = 'cloud-attachment-log';

let logCtx: AppContext | null = null;

export async function activateLogView(app: App, ctx: AppContext): Promise<void> {
	logCtx = ctx;
	 
	const leaf = app.workspace.getRightLeaf(false);
	if (!leaf) return;
	await leaf.setViewState({ type: LOG_VIEW_TYPE, active: true });
	void app.workspace.revealLeaf(leaf);
	const view = leaf.view;
	if (view instanceof LogView) {
		view.setContext(ctx);
	}
}

export class LogView extends ItemView {
	private ctx: AppContext | null = null;
	private levelFilter: LogLevel | 'all' = 'all';
	private categoryFilter: LogCategory | 'all' = 'all';
	private textFilter = '';

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return LOG_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Cloud activity log';
	}

	getIcon(): string {
		return 'scroll-text';
	}

	setContext(ctx: AppContext): void {
		this.ctx = ctx;
		this.render();
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cloud-attachment-log');
		if (!this.ctx) {
			contentEl.createEl('p', { text: 'Loading…' });
			return;
		}

		const toolbar = contentEl.createDiv({ cls: 'cloud-attachment-log-toolbar' });
		const levelSel = toolbar.createEl('select');
		for (const opt of ['all', 'info', 'warn', 'error', 'debug']) {
			const o = levelSel.createEl('option', { text: opt, value: opt });
			if (opt === this.levelFilter) o.selected = true;
		}
		levelSel.onchange = () => {
			this.levelFilter = levelSel.value as LogLevel | 'all';
			this.render();
		};

		const catSel = toolbar.createEl('select');
		for (const opt of [
			'all',
			'upload',
			'queue',
			'reference',
			'storage',
			'settings',
			'system',
		]) {
			const o = catSel.createEl('option', { text: opt, value: opt });
			if (opt === this.categoryFilter) o.selected = true;
		}
		catSel.onchange = () => {
			this.categoryFilter = catSel.value as LogCategory | 'all';
			this.render();
		};

		const search = toolbar.createEl('input', { type: 'search', placeholder: 'Filter…' });
		search.value = this.textFilter;
		search.oninput = () => {
			this.textFilter = search.value.toLowerCase();
			this.renderList();
		};

		const clearBtn = toolbar.createEl('button', { text: 'Clear log' });
		clearBtn.onclick = () => {
			void this.ctx?.log.clear().then(() => this.render());
		};

		this.listEl = contentEl.createDiv({ cls: 'cloud-attachment-log-list' });
		this.renderList();
	}

	private listEl!: HTMLDivElement;

	private renderList(): void {
		if (!this.ctx || !this.listEl) return;
		this.listEl.empty();
		let entries = this.ctx.log.getAll();
		if (this.levelFilter !== 'all') {
			entries = entries.filter((e) => e.level === this.levelFilter);
		}
		if (this.categoryFilter !== 'all') {
			entries = entries.filter((e) => e.category === this.categoryFilter);
		}
		if (this.textFilter) {
			entries = entries.filter(
				(e) =>
					e.message.toLowerCase().includes(this.textFilter) ||
					(e.detail?.toLowerCase().includes(this.textFilter) ?? false),
			);
		}
		entries = [...entries].reverse();
		for (const e of entries) {
			const row = this.listEl.createDiv({ cls: 'cloud-attachment-log-row' });
			row.createEl('span', { cls: 'cloud-attachment-log-time', text: e.at });
			row.createEl('span', {
				cls: `cloud-attachment-log-level cloud-attachment-log-level-${e.level}`,
				text: e.level,
			});
			row.createEl('span', { cls: 'cloud-attachment-log-cat', text: e.category });
			row.createEl('span', { text: e.message });
			if (e.detail) {
				row.createEl('div', {
					cls: 'cloud-attachment-log-detail',
					text: e.detail,
				});
			}
		}
	}
}

export function getLogContext(): AppContext | null {
	return logCtx;
}
