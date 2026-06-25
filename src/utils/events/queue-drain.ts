import type { Plugin } from 'obsidian';
import type { AppContext } from '../../app-context';

export function registerQueueDrain(plugin: Plugin, ctx: AppContext): void {
	plugin.registerDomEvent(window, 'online', () => {
		void ctx.queue.drain();
	});
}
