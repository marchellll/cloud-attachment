import { uuidv7 } from 'uuidv7';
import type { PluginDataRepo } from './plugin-data-repo';
import type { CloudAttachmentSettings } from '../settings';
import type { ILogRepo, LogEntry } from '../types';

export class PluginLogRepo implements ILogRepo {
	constructor(
		private data: PluginDataRepo,
		private getSettings: () => CloudAttachmentSettings,
	) {}

	async append(
		entry: Omit<LogEntry, 'id' | 'at'> & Partial<Pick<LogEntry, 'id' | 'at'>>,
	): Promise<void> {
		if (entry.level === 'debug' && !this.getSettings().logDebugEnabled) {
			return;
		}
		const full: LogEntry = {
			id: entry.id ?? uuidv7(),
			at: entry.at ?? new Date().toISOString(),
			level: entry.level,
			category: entry.category,
			message: entry.message,
			detail: entry.detail,
		};
		const max = this.getSettings().logRetentionMax;
		await this.data.mutateLogs((logs) => {
			logs.push(full);
			while (logs.length > max) {
				logs.shift();
			}
		});
	}

	getAll(): LogEntry[] {
		return [...this.data.getLogs()];
	}

	async clear(): Promise<void> {
		await this.data.mutateLogs((logs) => {
			logs.length = 0;
		});
	}
}
