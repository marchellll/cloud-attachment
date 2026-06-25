import type { Plugin, TAbstractFile } from 'obsidian';
import { TFile } from 'obsidian';
import type { AppContext } from '../../app-context';
import { vaultInternalGuard } from '../../repository/vault-internal-guard';
import { openProgressWindow } from '../../ui/progress-window';

let debounceTimer: number | null = null;
const pendingPaths = new Set<string>();

export function registerAutoUpload(plugin: Plugin, ctx: AppContext): void {
	plugin.registerEvent(
		plugin.app.vault.on('create', (file) => {
			handleFile(plugin, ctx, file);
		}),
	);
	plugin.registerEvent(
		plugin.app.vault.on('modify', (file) => {
			handleFile(plugin, ctx, file);
		}),
	);
}

function handleFile(
	plugin: Plugin,
	ctx: AppContext,
	file: TAbstractFile,
): void {
	if (!(file instanceof TFile)) return;
	if (!ctx.settingsRepo.get().autoUploadEnabled) return;
	if (vaultInternalGuard.consumePluginWrite(file.path)) return;

	const folder = ctx.vaultRepo.getAttachmentFolder();
	const inAttachment =
		!folder ||
		file.path === folder ||
		file.path.startsWith(folder + '/');
	const watch = ctx.settingsRepo.get().watchFolders;
	const inWatch = watch.some(
		(f: string) => file.path === f || file.path.startsWith(f + '/'),
	);
	if (!inAttachment && !inWatch) return;

	pendingPaths.add(file.path);
	if (debounceTimer) window.clearTimeout(debounceTimer);
	debounceTimer = window.setTimeout(() => {
		void flush(plugin, ctx);
	}, 1500);
}

async function flush(plugin: Plugin, ctx: AppContext): Promise<void> {
	const paths = [...pendingPaths];
	pendingPaths.clear();
	if (!paths.length || ctx.upload.isUploading()) return;
	if (ctx.settingsRepo.get().showProgressWindow) {
		openProgressWindow(ctx);
	}
	try {
		await ctx.upload.uploadFiles(paths);
	} catch (e) {
		if (!navigator.onLine) {
			for (const p of paths) {
				await ctx.queue.enqueue(
					p,
					e instanceof Error ? e.message : String(e),
				);
			}
		}
	}
}
