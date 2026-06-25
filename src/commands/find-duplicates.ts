import type { Plugin } from 'obsidian';
import type { AppContext } from '../app-context';
import { DuplicatesModal } from '../ui/duplicates-modal';
import { logCommand } from '../utils/log-command';

export function registerFindDuplicates(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'find-duplicates',
		name: 'Find duplicate cloud files',
		callback: () => {
			logCommand(ctx, 'Find duplicate cloud files');
			new DuplicatesModal(plugin.app, ctx).open();
		},
	});
}
