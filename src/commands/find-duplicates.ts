import type { Plugin } from 'obsidian';
import type { AppContext } from '../app-context';
import { DuplicatesModal } from '../ui/duplicates-modal';

export function registerFindDuplicates(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'find-duplicates',
		name: 'Find duplicate cloud files',
		callback: () => {
			new DuplicatesModal(plugin.app, ctx).open();
		},
	});
}
