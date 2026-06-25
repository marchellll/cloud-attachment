import type { Plugin } from 'obsidian';
import { Notice } from 'obsidian';
import type { AppContext } from '../app-context';
import { logCommand } from '../utils/log-command';

export function registerScanReferences(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'scan-references',
		name: 'Scan attachment references',
		callback: async () => {
			logCommand(ctx, 'Scan attachment references');
			if (!ctx.dataRepo.getAllUploads().length) {
				new Notice('Upload index is empty');
				return;
			}
			void ctx.log.info('reference', 'Reference scan started');
			const result = await ctx.reference.scanAll();
			void ctx.log.info(
				'reference',
				'Reference scan complete',
				`${result.files} files scanned, ${result.orphans} orphans`,
			);
			new Notice(
				`Scanned ${result.files} files, ${result.orphans} orphans`,
			);
		},
	});
}
