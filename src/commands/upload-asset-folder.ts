import { Notice, type Plugin } from 'obsidian';
import type { AppContext } from '../app-context';
import { extractLocalAttachmentPaths } from '../utils/local-attachment-extractor';
import { openProgressWindow } from '../ui/progress-window';

async function runUpload(ctx: AppContext, paths: string[]): Promise<void> {
	if (!paths.length) {
		new Notice('No files to upload');
		return;
	}
	if (ctx.settingsRepo.get().showProgressWindow) {
		openProgressWindow(ctx);
	}
	ctx.upload.setProgressCallback(() => {
		// progress view polls via callback registration in openProgressWindow
	});
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

export function registerUploadCommands(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'upload-asset-folder',
		name: 'Upload attachments from the asset folder',
		callback: async () => {
			const folder = ctx.vaultRepo.getAttachmentFolder();
			const paths = folder
				? ctx.vaultRepo.listFilesInFolder(folder)
				: [];
			const extra = ctx.settingsRepo.get().watchFolders.flatMap((f) =>
				ctx.vaultRepo.listFilesInFolder(f),
			);
			await runUpload(ctx, [...new Set([...paths, ...extra])]);
		},
	});

	plugin.addCommand({
		id: 'upload-folder',
		name: 'Upload attachments from this folder',
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) return false;
			if (!checking) {
				const folder = file.parent?.path ?? '';
				const paths = folder
					? ctx.vaultRepo.listFilesInFolder(folder)
					: [];
				void runUpload(ctx, paths);
			}
			return true;
		},
	});

	plugin.addCommand({
		id: 'upload-current-file',
		name: 'Upload attachments in current file',
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) return false;
			if (!checking) {
				void (async () => {
					const content = await plugin.app.vault.read(file);
					const paths = extractLocalAttachmentPaths(
						plugin.app,
						file.path,
						content,
					).filter((p) => plugin.app.vault.getAbstractFileByPath(p));
					await runUpload(ctx, paths);
				})();
			}
			return true;
		},
	});
}
