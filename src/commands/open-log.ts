import type { Plugin } from 'obsidian';
import type { AppContext } from '../app-context';
import { activateLogView } from '../ui/log-view';
import { logCommand } from '../utils/log-command';

export function registerOpenLog(plugin: Plugin, ctx: AppContext): void {
	plugin.addCommand({
		id: 'open-log',
		name: 'Open activity log',
		callback: () => {
			logCommand(ctx, 'Open activity log');
			void activateLogView(plugin.app, ctx);
		},
	});
}
