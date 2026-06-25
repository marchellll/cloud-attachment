import type { Plugin } from 'obsidian';
import type { AppContext } from '../../app-context';

export function registerQueueDrain(plugin: Plugin, ctx: AppContext): void {
	plugin.registerDomEvent(window, 'online', () => {
		void ctx.log.info('queue', 'Back online — draining upload queue');
		void ctx.queue.drain();
	});
}
