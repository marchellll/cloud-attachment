import type { Plugin } from 'obsidian';
import { Notice } from 'obsidian';
import type { AppContext } from '../app-context';

export function registerScanReferences(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'scan-references',
		name: 'Scan attachment references',
		callback: async () => {
			if (!ctx.dataRepo.getAllUploads().length) {
				new Notice('Upload index is empty');
				return;
			}
			const result = await ctx.reference.scanAll();
			new Notice(
				`Scanned ${result.files} files, ${result.orphans} orphans`,
			);
		},
	});
}
