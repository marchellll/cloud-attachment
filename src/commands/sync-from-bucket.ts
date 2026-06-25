import type { Plugin } from 'obsidian';
import type { AppContext } from '../app-context';

export function registerSyncFromBucket(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'sync-from-bucket',
		name: 'Sync from bucket',
		callback: async () => {
			await ctx.storage.syncFromBucket();
		},
	});
}
