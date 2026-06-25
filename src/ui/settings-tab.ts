import type { App } from 'obsidian';
import {
	PluginSettingTab,
	Setting,
	Notice,
} from 'obsidian';
import type CloudAttachmentPlugin from '../main';
import type { AppContext } from '../app-context';
import type { PostUploadLocalAction } from '../settings';

export class CloudAttachmentSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: CloudAttachmentPlugin,
		private ctx: AppContext,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const s = this.ctx.settingsRepo.get();

		new Setting(containerEl).setName('S3 connection').setHeading();

		new Setting(containerEl)
			.setName('Endpoint')
			.setDesc('S3-compatible endpoint URL')
			.addText((t) =>
				t.setValue(s.endpoint).onChange(async (v) => {
					await this.ctx.settingsRepo.set({ endpoint: v });
					this.ctx.cloudRepo.invalidateClient();
				}),
			);

		new Setting(containerEl)
			.setName('Region')
			.addText((t) =>
				t.setValue(s.region).onChange(async (v) => {
					await this.ctx.settingsRepo.set({ region: v });
					this.ctx.cloudRepo.invalidateClient();
				}),
			);

		new Setting(containerEl)
			.setName('Bucket')
			.addText((t) =>
				t.setValue(s.bucket).onChange((v) => {
					void this.ctx.settingsRepo.set({ bucket: v });
				}),
			);

		new Setting(containerEl)
			.setName('Public base URL')
			.setDesc('HTTPS base URL for link rewriting')
			.addText((t) =>
				t.setValue(s.publicBaseUrl).onChange((v) => {
					void this.ctx.settingsRepo.set({ publicBaseUrl: v });
				}),
			);

		new Setting(containerEl)
			.setName('Force path style')
			.setDesc('Enable for minio and most S3-compatible stores')
			.addToggle((t) =>
				t.setValue(s.forcePathStyle).onChange(async (v) => {
					await this.ctx.settingsRepo.set({ forcePathStyle: v });
					this.ctx.cloudRepo.invalidateClient();
				}),
			);

		new Setting(containerEl)
			.setName('Access key ID')
			.addText((t) => {
				void this.ctx.secretRepo.getAccessKeyId().then((v) => t.setValue(v));
				t.inputEl.type = 'password';
				t.onChange(async (v) => {
					await this.ctx.secretRepo.setAccessKeyId(v);
					this.ctx.cloudRepo.invalidateClient();
				});
			});

		new Setting(containerEl)
			.setName('Secret access key')
			.addText((t) => {
				void this.ctx.secretRepo
					.getSecretAccessKey()
					.then((v) => t.setValue(v));
				t.inputEl.type = 'password';
				t.onChange(async (v) => {
					await this.ctx.secretRepo.setSecretAccessKey(v);
					this.ctx.cloudRepo.invalidateClient();
				});
			});

		new Setting(containerEl)
			.setName('Test connection')
			.addButton((b) =>
				b.setButtonText('Test').onClick(async () => {
					try {
						if (!(await this.ctx.secretRepo.hasCredentials())) {
							new Notice('Credentials required');
							return;
						}
						await this.ctx.storage.testConnection();
						new Notice('Connection OK');
					} catch (e) {
						new Notice(
							`Connection failed — ${e instanceof Error ? e.message : String(e)}`,
						);
					}
				}),
			);

		new Setting(containerEl).setName('Upload behavior').setHeading();

		new Setting(containerEl)
			.setName('Auto upload')
			.addToggle((t) =>
				t.setValue(s.autoUploadEnabled).onChange((v) => {
					void this.ctx.settingsRepo.set({ autoUploadEnabled: v });
				}),
			);

		new Setting(containerEl)
			.setName('Watch folders')
			.setDesc('Comma-separated extra folders to watch')
			.addText((t) =>
				t
					.setValue(s.watchFolders.join(', '))
					.onChange((v) => {
						const folders = v
							.split(',')
							.map((x) => x.trim())
							.filter(Boolean);
						void this.ctx.settingsRepo.set({ watchFolders: folders });
					}),
			);

		new Setting(containerEl)
			.setName('Filename whitelist regex')
			.addText((t) =>
				t.setValue(s.filenameWhitelistRegex).onChange((v) => {
					void this.ctx.settingsRepo.set({ filenameWhitelistRegex: v });
				}),
			);

		new Setting(containerEl)
			.setName('Filename blacklist regex')
			.addText((t) =>
				t.setValue(s.filenameBlacklistRegex).onChange((v) => {
					void this.ctx.settingsRepo.set({ filenameBlacklistRegex: v });
				}),
			);

		new Setting(containerEl)
			.setName('Respect .gitignore')
			.addToggle((t) =>
				t.setValue(s.respectGitignore).onChange((v) => {
					void this.ctx.settingsRepo.set({ respectGitignore: v });
				}),
			);

		new Setting(containerEl)
			.setName('Max file size (bytes)')
			.addText((t) =>
				t.setValue(String(s.maxFileSizeBytes)).onChange((v) => {
					const n = parseInt(v, 10);
					if (!Number.isNaN(n)) {
						void this.ctx.settingsRepo.set({ maxFileSizeBytes: n });
					}
				}),
			);

		new Setting(containerEl)
			.setName('Warn usage (bytes)')
			.addText((t) =>
				t.setValue(String(s.warnUsageBytes)).onChange((v) => {
					const n = parseInt(v, 10);
					if (!Number.isNaN(n)) {
						void this.ctx.settingsRepo.set({ warnUsageBytes: n });
					}
				}),
			);

		new Setting(containerEl)
			.setName('Stop usage (bytes)')
			.addText((t) =>
				t.setValue(String(s.stopUsageBytes)).onChange((v) => {
					const n = parseInt(v, 10);
					if (!Number.isNaN(n)) {
						void this.ctx.settingsRepo.set({ stopUsageBytes: n });
					}
				}),
			);

		new Setting(containerEl)
			.setName('Cloud rename (uuidv7)')
			.addToggle((t) =>
				t.setValue(s.cloudRenameEnabled).onChange((v) => {
					void this.ctx.settingsRepo.set({ cloudRenameEnabled: v });
				}),
			);

		new Setting(containerEl)
			.setName('Post-upload local action')
			.addDropdown((d) =>
				d
					.addOption('keep', 'Keep')
					.addOption('move-trash', 'Move to trash')
					.addOption('move-folder', 'Move to folder')
					.addOption('delete', 'Delete')
					.setValue(s.postUploadLocalAction)
					.onChange((v) => {
						void this.ctx.settingsRepo.set({
							postUploadLocalAction: v as PostUploadLocalAction,
						});
					}),
			);

		new Setting(containerEl)
			.setName('Post-upload move folder')
			.addText((t) =>
				t.setValue(s.postUploadMoveFolder).onChange((v) => {
					void this.ctx.settingsRepo.set({ postUploadMoveFolder: v });
				}),
			);

		new Setting(containerEl)
			.setName('Show progress window')
			.addToggle((t) =>
				t.setValue(s.showProgressWindow).onChange((v) => {
					void this.ctx.settingsRepo.set({ showProgressWindow: v });
				}),
			);

		new Setting(containerEl)
			.setName('Batch concurrency')
			.addText((t) =>
				t.setValue(String(s.batchConcurrency)).onChange((v) => {
					const n = parseInt(v, 10);
					if (!Number.isNaN(n) && n > 0) {
						void this.ctx.settingsRepo.set({ batchConcurrency: n });
					}
				}),
			);

		new Setting(containerEl).setName('Reference tracking').setHeading();

		new Setting(containerEl)
			.setName('Enable reference tracking')
			.setDesc('When off, no automatic reference sync runs')
			.addToggle((t) =>
				t.setValue(s.referenceTrackingEnabled).onChange((v) => {
					void this.ctx.settingsRepo.set({ referenceTrackingEnabled: v });
				}),
			);

		new Setting(containerEl)
			.setName('Reference scan schedule')
			.addDropdown((d) =>
				d
					.addOption('daily', 'Daily')
					.addOption('weekly', 'Weekly')
					.addOption('monthly', 'Monthly')
					.setValue(s.referenceScanSchedule)
					.onChange((v) => {
						void this.ctx.settingsRepo.set({
							referenceScanSchedule: v as 'daily' | 'weekly' | 'monthly',
						});
					}),
			);

		new Setting(containerEl)
			.setName('Reference debounce (ms)')
			.addText((t) =>
				t.setValue(String(s.referenceUpdateDebounceMs)).onChange((v) => {
					const n = parseInt(v, 10);
					if (!Number.isNaN(n)) {
						void this.ctx.settingsRepo.set({
							referenceUpdateDebounceMs: n,
						});
					}
				}),
			);

		new Setting(containerEl).setName('Activity log').setHeading();

		new Setting(containerEl)
			.setName('Log retention max')
			.addText((t) =>
				t.setValue(String(s.logRetentionMax)).onChange((v) => {
					const n = parseInt(v, 10);
					if (!Number.isNaN(n)) {
						void this.ctx.settingsRepo.set({ logRetentionMax: n });
					}
				}),
			);

		new Setting(containerEl)
			.setName('Debug logging')
			.addToggle((t) =>
				t.setValue(s.logDebugEnabled).onChange((v) => {
					void this.ctx.settingsRepo.set({ logDebugEnabled: v });
				}),
			);
	}
}
