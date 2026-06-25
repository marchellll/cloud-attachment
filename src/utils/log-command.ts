import type { AppContext } from '../app-context';

export function logCommand(ctx: AppContext, commandName: string): void {
	void ctx.log.info('system', 'Command triggered', commandName);
}
