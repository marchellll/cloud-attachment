import type { App, Plugin } from 'obsidian';
import { PluginDataRepo } from './repository/plugin-data-repo';
import { ObsidianSecretRepo } from './repository/obsidian-secret-repo';
import { PluginSettingsRepo } from './repository/plugin-settings-repo';
import { S3CloudStorageRepo } from './repository/s3-cloud-storage-repo';
import { ObsidianVaultRepo } from './repository/obsidian-vault-repo';
import { PluginLogRepo } from './repository/plugin-log-repo';
import { LogService } from './service/log-service';
import { QuotaService } from './service/quota-service';
import { LinkService } from './service/link-service';
import { ReferenceService } from './service/reference-service';
import { UploadService } from './service/upload-service';
import { QueueService } from './service/queue-service';
import { StorageService } from './service/storage-service';

export class AppContext {
	readonly dataRepo: PluginDataRepo;
	readonly settingsRepo: PluginSettingsRepo;
	readonly secretRepo: ObsidianSecretRepo;
	readonly cloudRepo: S3CloudStorageRepo;
	readonly vaultRepo: ObsidianVaultRepo;
	readonly logRepo: PluginLogRepo;
	readonly log: LogService;
	readonly quota: QuotaService;
	readonly links: LinkService;
	readonly reference: ReferenceService;
	readonly upload: UploadService;
	readonly queue: QueueService;
	readonly storage: StorageService;

	constructor(
		public app: App,
		plugin: Plugin,
	) {
		this.dataRepo = new PluginDataRepo(plugin);
		this.settingsRepo = new PluginSettingsRepo(this.dataRepo);
		this.secretRepo = new ObsidianSecretRepo(app);
		this.cloudRepo = new S3CloudStorageRepo(this.settingsRepo, this.secretRepo);
		this.vaultRepo = new ObsidianVaultRepo(app);
		this.logRepo = new PluginLogRepo(this.dataRepo, () =>
			this.settingsRepo.get(),
		);
		this.log = new LogService(this.logRepo, () => this.settingsRepo.get());
		this.quota = new QuotaService(this.dataRepo, this.settingsRepo, this.log);
		this.links = new LinkService(this.vaultRepo, this.log);
		this.reference = new ReferenceService(
			this.dataRepo,
			this.vaultRepo,
			this.settingsRepo,
			this.log,
		);
		this.upload = new UploadService(
			app,
			this.settingsRepo,
			this.secretRepo,
			this.dataRepo,
			this.cloudRepo,
			this.vaultRepo,
			this.quota,
			this.links,
			this.reference,
			this.log,
		);
		this.queue = new QueueService(this.dataRepo, this.log, () => this.upload);
		this.storage = new StorageService(
			this.cloudRepo,
			this.dataRepo,
			this.vaultRepo,
			this.settingsRepo,
			this.log,
		);
	}

	async init(): Promise<void> {
		await this.dataRepo.load();
		await this.secretRepo.load();
		await this.log.debug('system', 'Plugin loaded');
	}
}
