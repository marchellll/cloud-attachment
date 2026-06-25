import type { PluginLogRepo } from '../repository/plugin-log-repo';
import type { CloudAttachmentSettings } from '../settings';
import type { LogCategory, LogLevel } from '../types';

export class LogService {
	constructor(
		private logRepo: PluginLogRepo,
		private getSettings: () => CloudAttachmentSettings,
	) {}

	info(category: LogCategory, message: string, detail?: string): Promise<void> {
		return this.log('info', category, message, detail);
	}

	warn(category: LogCategory, message: string, detail?: string): Promise<void> {
		return this.log('warn', category, message, detail);
	}

	error(category: LogCategory, message: string, detail?: string): Promise<void> {
		return this.log('error', category, message, detail);
	}

	debug(category: LogCategory, message: string, detail?: string): Promise<void> {
		return this.log('debug', category, message, detail);
	}

	private log(
		level: LogLevel,
		category: LogCategory,
		message: string,
		detail?: string,
	): Promise<void> {
		return this.logRepo.append({ level, category, message, detail });
	}

	getAll() {
		return this.logRepo.getAll();
	}

	clear() {
		return this.logRepo.clear();
	}
}
