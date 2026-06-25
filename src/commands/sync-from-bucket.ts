import type { Plugin } from 'obsidian';
import type { AppContext } from '../app-context';
import { logCommand } from '../utils/log-command';

export function registerSyncFromBucket(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'sync-from-bucket',
		name: 'Sync from bucket',
		callback: async () => {
			logCommand(ctx, 'Sync from bucket');
			await ctx.storage.syncFromBucket();
		},
	});
}
