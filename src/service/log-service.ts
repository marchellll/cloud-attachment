import type { PluginLogRepo } from '../repository/plugin-log-repo';
import type { CloudAttachmentSettings } from '../settings';
import type { LogCategory, LogLevel } from '../types';

export class LogService {
	private changeListeners = new Set<() => void>();

	constructor(
		private logRepo: PluginLogRepo,
		private getSettings: () => CloudAttachmentSettings,
	) {}

	onChange(listener: () => void): () => void {
		this.changeListeners.add(listener);
		return () => this.changeListeners.delete(listener);
	}

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

	private async log(
		level: LogLevel,
		category: LogCategory,
		message: string,
		detail?: string,
	): Promise<void> {
		await this.logRepo.append({ level, category, message, detail });
		this.notifyChange();
	}

	private notifyChange(): void {
		for (const listener of this.changeListeners) {
			listener();
		}
	}

	getAll() {
		return this.logRepo.getAll();
	}

	clear() {
		return this.logRepo.clear().then(() => this.notifyChange());
	}
}
