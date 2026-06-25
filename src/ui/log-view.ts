import type { App } from 'obsidian';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { AppContext } from '../app-context';
import type { LogCategory, LogEntry, LogLevel } from '../types';

export const LOG_VIEW_TYPE = 'cloud-attachment-log';

const SCROLL_BOTTOM_THRESHOLD = 48;

let logCtx: AppContext | null = null;

function isSidebarLeaf(app: App, leaf: WorkspaceLeaf): boolean {
	let parent = leaf.parent;
	while (parent) {
		if (
			parent === app.workspace.leftSplit ||
			parent === app.workspace.rightSplit
		) {
			return true;
		}
		parent = parent.parent;
	}
	return false;
}

export function closeSidebarLogLeaves(app: App): void {
	for (const leaf of app.workspace.getLeavesOfType(LOG_VIEW_TYPE)) {
		if (isSidebarLeaf(app, leaf)) {
			leaf.detach();
		}
	}
}

export async function activateLogView(app: App, ctx: AppContext): Promise<void> {
	logCtx = ctx;
	closeSidebarLogLeaves(app);

	const existing = app.workspace
		.getLeavesOfType(LOG_VIEW_TYPE)
		.find((leaf) => !isSidebarLeaf(app, leaf));
	const leaf = existing ?? app.workspace.getLeaf('tab');
	await leaf.setViewState({ type: LOG_VIEW_TYPE, active: true });
	void app.workspace.revealLeaf(leaf);
	const view = leaf.view;
	if (view instanceof LogView) {
		view.setContext(ctx);
	}
}

function formatLogTime(iso: string): string {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

function formatLogLine(entry: LogEntry): string {
	const parts = [
		formatLogTime(entry.at),
		entry.level.padEnd(5),
		entry.category.padEnd(9),
		entry.message,
	];
	if (entry.detail) parts.push(entry.detail);
	return parts.join('  ');
}

export class LogView extends ItemView {
	private ctx: AppContext | null = null;
	private levelFilter: LogLevel | 'all' = 'all';
	private categoryFilter: LogCategory | 'all' = 'all';
	private textFilter = '';
	private unsubLog: (() => void) | null = null;
	private stickToBottom = true;

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
		this.unsubLog?.();
		this.ctx = ctx;
		this.unsubLog = ctx.log.onChange(() => {
			if (this.listEl) this.renderList();
		});
		this.render();
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		this.unsubLog?.();
		this.unsubLog = null;
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

		const levelWrap = toolbar.createDiv({ cls: 'cloud-attachment-log-filter' });
		levelWrap.createSpan({ cls: 'cloud-attachment-log-filter-label', text: 'Level' });
		const levelSel = levelWrap.createEl('select');
		for (const opt of ['all', 'info', 'warn', 'error', 'debug']) {
			const o = levelSel.createEl('option', { text: opt, value: opt });
			if (opt === this.levelFilter) o.selected = true;
		}
		levelSel.onchange = () => {
			this.levelFilter = levelSel.value as LogLevel | 'all';
			this.stickToBottom = true;
			this.renderList();
		};

		const catWrap = toolbar.createDiv({ cls: 'cloud-attachment-log-filter' });
		catWrap.createSpan({ cls: 'cloud-attachment-log-filter-label', text: 'Category' });
		const catSel = catWrap.createEl('select');
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
			this.stickToBottom = true;
			this.renderList();
		};

		const searchWrap = toolbar.createDiv({ cls: 'cloud-attachment-log-filter' });
		searchWrap.createSpan({ cls: 'cloud-attachment-log-filter-label', text: 'Search' });
		const search = searchWrap.createEl('input', {
			type: 'search',
			placeholder: 'Filter…',
		});
		search.value = this.textFilter;
		search.oninput = () => {
			this.textFilter = search.value.toLowerCase();
			this.stickToBottom = true;
			this.renderList();
		};

		const clearBtn = toolbar.createEl('button', {
			cls: 'cloud-attachment-log-clear',
			text: 'Clear log',
		});
		clearBtn.onclick = () => {
			void this.ctx?.log.clear().then(() => {
				this.stickToBottom = true;
				this.render();
			});
		};

		this.listEl = contentEl.createDiv({ cls: 'cloud-attachment-log-list' });
		this.listEl.onscroll = () => this.updateStickToBottom();
		this.renderList();
	}

	private listEl!: HTMLDivElement;

	private updateStickToBottom(): void {
		const el = this.listEl;
		this.stickToBottom =
			el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
	}

	private scrollToBottom(): void {
		if (!this.stickToBottom) return;
		window.requestAnimationFrame(() => {
			this.listEl.scrollTop = this.listEl.scrollHeight;
		});
	}

	private filterEntries(): LogEntry[] {
		if (!this.ctx) return [];
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
		return entries;
	}

	private renderList(): void {
		if (!this.ctx || !this.listEl) return;
		this.listEl.empty();
		const entries = this.filterEntries();
		if (!entries.length) {
			this.listEl.createEl('p', {
				cls: 'cloud-attachment-log-empty',
				text: 'No log entries match the current filters.',
			});
			return;
		}
		for (const e of entries) {
			const row = this.listEl.createDiv({
				cls: `cloud-attachment-log-row cloud-attachment-log-level-${e.level}`,
			});
			row.createEl('pre', { cls: 'cloud-attachment-log-line', text: formatLogLine(e) });
		}
		this.scrollToBottom();
	}
}

export function getLogContext(): AppContext | null {
	return logCtx;
}
