import type { App } from 'obsidian';
import {
	PluginSettingTab,
	Setting,
	Notice,
} from 'obsidian';
import type { TextComponent } from 'obsidian';
import type CloudAttachmentPlugin from '../main';
import type { AppContext } from '../app-context';
import type { PostUploadLocalAction } from '../settings';
import { updateRequiredError } from './required-setting';

const BYTES_PER_MB = 1024 * 1024;

function bytesToMb(bytes: number): string {
	return String(bytes / BYTES_PER_MB);
}

function parseMbInput(value: string): number | null {
	const n = parseFloat(value);
	if (Number.isNaN(n) || n < 0) return null;
	return Math.round(n * BYTES_PER_MB);
}

function msToSeconds(ms: number): string {
	return String(ms / 1000);
}

function parseSecondsInput(value: string): number | null {
	const n = parseFloat(value);
	if (Number.isNaN(n) || n < 0) return null;
	return Math.round(n * 1000);
}

function addGroupHeading(
	container: HTMLElement,
	name: string,
	description: string,
): void {
	new Setting(container).setName(name).setHeading();
	container.createDiv({
		cls: 'setting-item-description',
		text: description,
	});
}

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

		try {
			this.renderSettings();
		} catch (e) {
			console.error('[cloud-attachment] settings tab failed', e);
			containerEl.createEl('p', {
				text: `Settings failed to load: ${e instanceof Error ? e.message : String(e)}`,
			});
			new Notice('Cloud attachment settings failed — see developer console');
		}
	}

	private renderSettings(): void {
		const { containerEl } = this;
		const s = this.ctx.settingsRepo.get();

		addGroupHeading(
			containerEl,
			'S3 connection',
			'Credentials and endpoint for your S3-compatible bucket. Required before any upload.',
		);

		const endpointSetting = new Setting(containerEl)
			.setName('Endpoint')
			.setDesc('S3-compatible endpoint URL (for example https://s3.amazonaws.com or your MinIO host).')
			.addText((t) => {
				t.setValue(s.endpoint).onChange(async (v) => {
					await this.ctx.settingsRepo.set({ endpoint: v });
					this.ctx.cloudRepo.invalidateClient();
					updateRequiredError(endpointSetting, !v.trim());
				});
			});
		updateRequiredError(endpointSetting, !s.endpoint.trim());

		new Setting(containerEl)
			.setName('Region')
			.setDesc('Aws region or auto for providers that ignore it (most S3-compatible stores).')
			.addText((t) =>
				t.setValue(s.region).onChange(async (v) => {
					await this.ctx.settingsRepo.set({ region: v });
					this.ctx.cloudRepo.invalidateClient();
				}),
			);

		const bucketSetting = new Setting(containerEl)
			.setName('Bucket')
			.setDesc('Target bucket name. Uploaded objects are stored here.')
			.addText((t) => {
				t.setValue(s.bucket).onChange((v) => {
					void this.ctx.settingsRepo.set({ bucket: v });
					updateRequiredError(bucketSetting, !v.trim());
				});
			});
		updateRequiredError(bucketSetting, !s.bucket.trim());

		const publicBaseUrlSetting = new Setting(containerEl)
			.setName('Public base URL')
			.setDesc(
				'HTTPS base URL used when rewriting note links (for example a CDN or bucket website URL). Must match how files are served publicly.',
			)
			.addText((t) => {
				t.setValue(s.publicBaseUrl).onChange((v) => {
					void this.ctx.settingsRepo.set({ publicBaseUrl: v });
					updateRequiredError(publicBaseUrlSetting, !v.trim());
				});
			});
		updateRequiredError(publicBaseUrlSetting, !s.publicBaseUrl.trim());

		new Setting(containerEl)
			.setName('Force path style')
			.setDesc(
				'Use path-style urls (endpoint/bucket/key). Enable for minio and most S3-compatible stores; disable for aws virtual-hosted style.',
			)
			.addToggle((t) =>
				t.setValue(s.forcePathStyle).onChange(async (v) => {
					await this.ctx.settingsRepo.set({ forcePathStyle: v });
					this.ctx.cloudRepo.invalidateClient();
				}),
			);

		const accessKeySetting = new Setting(containerEl)
			.setName('Access key ID')
			.setDesc('Stored securely in Obsidian secrets, not in plugin data.')
			.addText((t) => {
				t.inputEl.type = 'password';
				const key = this.ctx.secretRepo.getAccessKeyIdSync();
				t.setValue(key).onChange(async (v) => {
					await this.ctx.secretRepo.setAccessKeyId(v);
					this.ctx.cloudRepo.invalidateClient();
					updateRequiredError(accessKeySetting, !v.trim());
				});
			});
		updateRequiredError(
			accessKeySetting,
			!this.ctx.secretRepo.getAccessKeyIdSync().trim(),
		);

		const secretKeySetting = new Setting(containerEl)
			.setName('Secret access key')
			.setDesc('Stored securely in Obsidian secrets, not in plugin data.')
			.addText((t) => {
				t.inputEl.type = 'password';
				const secret = this.ctx.secretRepo.getSecretAccessKeySync();
				t.setValue(secret).onChange(async (v) => {
					await this.ctx.secretRepo.setSecretAccessKey(v);
					this.ctx.cloudRepo.invalidateClient();
					updateRequiredError(secretKeySetting, !v.trim());
				});
			});
		updateRequiredError(
			secretKeySetting,
			!this.ctx.secretRepo.getSecretAccessKeySync().trim(),
		);

		new Setting(containerEl)
			.setName('Test connection')
			.setDesc('Verify credentials and bucket access without uploading a file.')
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

		addGroupHeading(
			containerEl,
			'Automatic upload',
			'Upload new or changed files without running a command. Watches Obsidian\'s attachment folder plus any extra folders you list.',
		);

		let watchFoldersSetting: Setting;

		new Setting(containerEl)
			.setName('Auto upload')
			.setDesc(
				'When on, files created or modified in the attachment folder or watch folders are uploaded automatically after a short delay.',
			)
			.addToggle((t) =>
				t.setValue(s.autoUploadEnabled).onChange((v) => {
					void this.ctx.settingsRepo.set({ autoUploadEnabled: v });
					watchFoldersSetting.settingEl.hidden = !v;
				}),
			);

		watchFoldersSetting = new Setting(containerEl)
			.setName('Watch folders')
			.setDesc(
				'Vault paths (comma-separated) to watch in addition to the attachment folder. Only used when auto upload is on.',
			)
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
		watchFoldersSetting.settingEl.hidden = !s.autoUploadEnabled;

		addGroupHeading(
			containerEl,
			'Upload filters',
			'Rules applied before every upload (automatic and manual). Files that fail a filter are skipped.',
		);

		new Setting(containerEl)
			.setName('Filename whitelist regex')
			.setDesc(
				'Only upload files whose basename matches this pattern. Leave empty to allow all filenames. Default matches common image, audio, and video extensions.',
			)
			.addText((t) =>
				t.setValue(s.filenameWhitelistRegex).onChange((v) => {
					void this.ctx.settingsRepo.set({ filenameWhitelistRegex: v });
				}),
			);

		new Setting(containerEl)
			.setName('Filename blacklist regex')
			.setDesc(
				'Skip files whose basename matches this pattern. Checked after the whitelist. Leave empty to disable.',
			)
			.addText((t) =>
				t.setValue(s.filenameBlacklistRegex).onChange((v) => {
					void this.ctx.settingsRepo.set({ filenameBlacklistRegex: v });
				}),
			);

		new Setting(containerEl)
			.setName('Respect .gitignore')
			.setDesc(
				'When on, files matched by .gitignore in the vault (or parent folders) are never uploaded.',
			)
			.addToggle((t) =>
				t.setValue(s.respectGitignore).onChange((v) => {
					void this.ctx.settingsRepo.set({ respectGitignore: v });
				}),
			);

		new Setting(containerEl)
			.setName('Max file size (mb)')
			.setDesc('Skip files larger than this limit. Applies to automatic and manual uploads.')
			.addText((t) =>
				t.setValue(bytesToMb(s.maxFileSizeBytes)).onChange((v) => {
					const bytes = parseMbInput(v);
					if (bytes !== null) {
						void this.ctx.settingsRepo.set({ maxFileSizeBytes: bytes });
					}
				}),
			);

		addGroupHeading(
			containerEl,
			'Storage quota',
			'Limits total uploaded bytes tracked by the plugin. Warn logs a message; stop blocks new uploads.',
		);

		new Setting(containerEl)
			.setName('Warn usage (mb)')
			.setDesc(
				'When total indexed cloud usage reaches this size, a warning is written to the activity log. Uploads still continue.',
			)
			.addText((t) =>
				t.setValue(bytesToMb(s.warnUsageBytes)).onChange((v) => {
					const bytes = parseMbInput(v);
					if (bytes !== null) {
						void this.ctx.settingsRepo.set({ warnUsageBytes: bytes });
					}
				}),
			);

		new Setting(containerEl)
			.setName('Stop usage (mb)')
			.setDesc(
				'When total indexed cloud usage reaches this size, new uploads are rejected until usage drops or the limit is raised.',
			)
			.addText((t) =>
				t.setValue(bytesToMb(s.stopUsageBytes)).onChange((v) => {
					const bytes = parseMbInput(v);
					if (bytes !== null) {
						void this.ctx.settingsRepo.set({ stopUsageBytes: bytes });
					}
				}),
			);

		addGroupHeading(
			containerEl,
			'Upload processing',
			'What happens to files during and after upload.',
		);

		new Setting(containerEl)
			.setName('Cloud rename (uuidv7)')
			.setDesc(
				'When on, uploaded objects get a unique uuidv7 filename in the bucket instead of keeping the original basename.',
			)
			.addToggle((t) =>
				t.setValue(s.cloudRenameEnabled).onChange((v) => {
					void this.ctx.settingsRepo.set({ cloudRenameEnabled: v });
				}),
			);

		let moveFolderSetting: Setting;
		let moveFolderText: TextComponent;

		new Setting(containerEl)
			.setName('Post-upload local action')
			.setDesc(
				'What to do with the original vault file after a successful upload and link rewrite.',
			)
			.addDropdown((d) =>
				d
					.addOption('keep', 'Keep')
					.addOption('move-trash', 'Move to trash')
					.addOption('move-folder', 'Move to folder')
					.addOption('delete', 'Delete')
					.setValue(s.postUploadLocalAction)
					.onChange((v) => {
						const action = v as PostUploadLocalAction;
						const updates: {
							postUploadLocalAction: PostUploadLocalAction;
							postUploadMoveFolder?: string;
						} = { postUploadLocalAction: action };
						if (
							action === 'move-folder' &&
							!this.ctx.settingsRepo.get().postUploadMoveFolder.trim()
						) {
							updates.postUploadMoveFolder = '.trash';
						}
						void this.ctx.settingsRepo.set(updates);
						moveFolderSetting.settingEl.hidden = action !== 'move-folder';
						if (action === 'move-folder' && updates.postUploadMoveFolder) {
							moveFolderText.setValue(updates.postUploadMoveFolder);
						}
					}),
			);

		moveFolderSetting = new Setting(containerEl)
			.setName('Post-upload move folder')
			.setDesc(
				'Vault folder path to move the local file into after upload. Only used when post-upload local action is move to folder.',
			)
			.addText((t) => {
				moveFolderText = t;
				t.setValue(s.postUploadMoveFolder).onChange((v) => {
					void this.ctx.settingsRepo.set({ postUploadMoveFolder: v });
				});
			});
		moveFolderSetting.settingEl.hidden = s.postUploadLocalAction !== 'move-folder';

		new Setting(containerEl)
			.setName('Batch concurrency')
			.setDesc(
				'How many files upload in parallel. Higher values are faster but use more bandwidth and memory.',
			)
			.addText((t) =>
				t.setValue(String(s.batchConcurrency)).onChange((v) => {
					const n = parseInt(v, 10);
					if (!Number.isNaN(n) && n > 0) {
						void this.ctx.settingsRepo.set({ batchConcurrency: n });
					}
				}),
			);

		addGroupHeading(
			containerEl,
			'Reference tracking',
			'Tracks which notes link to each uploaded file so orphans and ref counts stay accurate.',
		);

		let scanScheduleSetting: Setting;
		let refDebounceSetting: Setting;

		new Setting(containerEl)
			.setName('Enable reference tracking')
			.setDesc(
				'When off, the plugin does not scan notes or update reference counts. Orphan detection and ref counts in the storage view will be stale.',
			)
			.addToggle((t) =>
				t.setValue(s.referenceTrackingEnabled).onChange((v) => {
					void this.ctx.settingsRepo.set({ referenceTrackingEnabled: v });
					scanScheduleSetting.settingEl.hidden = !v;
					refDebounceSetting.settingEl.hidden = !v;
				}),
			);

		scanScheduleSetting = new Setting(containerEl)
			.setName('Reference scan schedule')
			.setDesc(
				'How often to run a full vault scan to reconcile cloud key references in all notes. Only runs when reference tracking is on.',
			)
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
		scanScheduleSetting.settingEl.hidden = !s.referenceTrackingEnabled;

		refDebounceSetting = new Setting(containerEl)
			.setName('Reference update debounce (seconds)')
			.setDesc(
				'Wait this long after a note edit before syncing its cloud references. Reduces work while you type. Only used when reference tracking is on.',
			)
			.addText((t) =>
				t.setValue(msToSeconds(s.referenceUpdateDebounceMs)).onChange((v) => {
					const ms = parseSecondsInput(v);
					if (ms !== null) {
						void this.ctx.settingsRepo.set({
							referenceUpdateDebounceMs: ms,
						});
					}
				}),
			);
		refDebounceSetting.settingEl.hidden = !s.referenceTrackingEnabled;

		addGroupHeading(
			containerEl,
			'Activity log',
			'In-plugin log for uploads, reference sync, and errors. Open it from the command palette.',
		);

		new Setting(containerEl)
			.setName('Log retention max (lines)')
			.setDesc(
				'Maximum number of log lines kept in plugin data. Older lines are removed when this limit is exceeded.',
			)
			.addText((t) =>
				t.setValue(String(s.logRetentionMax)).onChange((v) => {
					const n = parseInt(v, 10);
					if (!Number.isNaN(n) && n > 0) {
						void this.ctx.settingsRepo.set({ logRetentionMax: n });
					}
				}),
			);

		new Setting(containerEl)
			.setName('Debug logging')
			.setDesc(
				'When on, write verbose debug entries to the activity log. Useful for troubleshooting; increases log volume.',
			)
			.addToggle((t) =>
				t.setValue(s.logDebugEnabled).onChange((v) => {
					void this.ctx.settingsRepo.set({ logDebugEnabled: v });
				}),
			);
	}
}
