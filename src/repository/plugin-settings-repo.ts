import type { PluginDataRepo } from './plugin-data-repo';
import type { CloudAttachmentSettings } from '../settings';
import type { ISettingsRepo } from '../types';

export class PluginSettingsRepo implements ISettingsRepo {
	constructor(private dataRepo: PluginDataRepo) {}

	get(): CloudAttachmentSettings {
		return this.dataRepo.getSettings();
	}

	async set(partial: Partial<CloudAttachmentSettings>): Promise<void> {
		await this.dataRepo.setSettings(partial);
	}
}
