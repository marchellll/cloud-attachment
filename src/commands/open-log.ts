import type { Plugin } from 'obsidian';
import type { AppContext } from '../app-context';
import { activateLogView } from '../ui/log-view';

export function registerOpenLog(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'open-log',
		name: 'Open activity log',
		callback: () => {
			void activateLogView(plugin.app, ctx);
		},
	});
}
