import { Notice, type Plugin } from 'obsidian';
import type { AppContext } from '../app-context';
import { extractLocalAttachmentPaths } from '../utils/local-attachment-extractor';
import { logCommand } from '../utils/log-command';

async function runUpload(
	ctx: AppContext,
	paths: string[],
	commandName: string,
): Promise<void> {
	if (!paths.length) {
		new Notice('No files to upload');
		return;
	}
	logCommand(ctx, commandName);
	void ctx.log.info(
		'upload',
		'Upload batch started',
		`${paths.length} file(s): ${paths.join(', ')}`,
	);
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
			await runUpload(
				ctx,
				[...new Set([...paths, ...extra])],
				'Upload attachments from the asset folder',
			);
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
				void runUpload(ctx, paths, 'Upload attachments from this folder');
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
					await runUpload(
						ctx,
						paths,
						'Upload attachments in current file',
					);
				})();
			}
			return true;
		},
	});
}
