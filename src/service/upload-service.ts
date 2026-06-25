import type { App } from 'obsidian';
import { Notice } from 'obsidian';
import type {
	ICloudStorageRepo,
	ISecretRepo,
	ISettingsRepo,
	IUploadIndexRepo,
	IVaultRepo,
	UploadProgress,
	UploadRecord,
} from '../types';
import { buildCloudKey, buildPublicUrl } from '../utils/cloud-key-builder';
import { sha256Hex } from '../utils/content-hash';
import { isGitignored } from '../utils/gitignore-filter';
import { ensureFileExtension, resolveContentType } from '../utils/mime';
import { shouldUploadFile } from '../utils/upload-filter';
import type { LinkService } from './link-service';
import type { LogService } from './log-service';
import type { QuotaService } from './quota-service';
import type { ReferenceService } from './reference-service';

export type ProgressCallback = (items: UploadProgress[]) => void;

export class UploadService {
	private uploading = false;
	private progressItems: UploadProgress[] = [];
	private onProgress: ProgressCallback | null = null;

	constructor(
		private app: App,
		private settings: ISettingsRepo,
		private secrets: ISecretRepo,
		private index: IUploadIndexRepo,
		private cloud: ICloudStorageRepo,
		private vault: IVaultRepo,
		private quota: QuotaService,
		private links: LinkService,
		private reference: ReferenceService,
		private log: LogService,
	) {}

	setProgressCallback(cb: ProgressCallback | null): void {
		this.onProgress = cb;
	}

	private emitProgress(): void {
		this.onProgress?.([...this.progressItems]);
	}

	async uploadFiles(paths: string[]): Promise<void> {
		if (this.uploading) {
			new Notice('Upload already in progress');
			return;
		}
		if (!(await this.secrets.hasCredentials())) {
			new Notice('Configure S3 credentials in settings');
			return;
		}
		const s = this.settings.get();
		if (!s.bucket || !s.publicBaseUrl) {
			new Notice('Configure bucket and public base URL');
			return;
		}

		this.uploading = true;
		this.progressItems = paths.map((p) => ({
			filePath: p,
			status: 'pending' as const,
		}));
		this.emitProgress();
		this.reference.beginUploadBatch();

		try {
			const concurrency = s.batchConcurrency;
			let i = 0;
			const workers = Array.from({ length: concurrency }, async () => {
				while (i < paths.length) {
					const idx = i++;
					const path = paths[idx];
					if (path) {
						await this.uploadOne(path, idx);
					}
				}
			});
			await Promise.all(workers);
			if (s.referenceTrackingEnabled) {
				await this.reference.endUploadBatch();
			}
		} finally {
			this.uploading = false;
			this.emitProgress();
		}
	}

	private async uploadOne(path: string, idx: number): Promise<void> {
		const update = (patch: Partial<UploadProgress>) => {
			const cur = this.progressItems[idx];
			if (cur) {
				this.progressItems[idx] = { ...cur, ...patch };
				this.emitProgress();
			}
		};

		try {
			const buf = await this.vault.readBinary(path);
			const size = buf.byteLength;
			const s = this.settings.get();
			const gitignored = s.respectGitignore
				? await isGitignored(this.app, path)
				: false;
			const filter = shouldUploadFile(
				path,
				size,
				s,
				gitignored,
			);
			if (!filter.allowed) {
				update({ status: 'skipped', message: filter.reason });
				await this.log.info('upload', 'Skipped upload', `${path}: ${filter.reason}`);
				return;
			}

			await this.quota.checkQuota(size);
			const hash = await sha256Hex(buf);
			const existing = this.index.findByContentHash(hash);
			if (existing) {
				const localPaths = [...(existing.localPaths ?? [])];
				if (existing.localPath !== path && !localPaths.includes(path)) {
					localPaths.push(path);
				}
				await this.index.saveUpload({ ...existing, localPaths });
				const rewritten = await this.links.rewriteLinks(path, existing.publicUrl);
				this.reference.trackTouchedNote(rewritten);
				update({ status: 'skipped', message: 'Duplicate — linked to existing' });
				await this.log.info(
					'upload',
					'Duplicate content — linked to existing URL',
					`${path} → ${existing.publicUrl}`,
				);
				return;
			}

			update({ status: 'uploading', percent: 0 });
			await this.log.info('upload', 'Uploading file', path);
			const contentType = resolveContentType(path, buf);
			const uploadName = ensureFileExtension(
				path.split('/').pop() ?? path,
				contentType,
			);
			const cloudKey = buildCloudKey(uploadName, s.cloudRenameEnabled);
			const publicUrl = buildPublicUrl(s.publicBaseUrl, cloudKey);

			await this.cloud.putObject(cloudKey, buf, contentType, (pct) => {
				update({ percent: pct });
			});

			const record: UploadRecord = {
				cloudKey,
				publicUrl,
				contentHash: hash,
				size,
				uploadedAt: new Date().toISOString(),
				localPath: path,
				localPaths: [path],
				refCount: 0,
				referencingNotes: [],
				linkStatus: 'ok',
			};

			let rewritten: string[] = [];
			try {
				rewritten = await this.links.rewriteLinks(path, publicUrl);
			} catch {
				record.linkStatus = 'pending';
				await this.index.saveUpload(record);
				update({ status: 'error', message: 'Link rewrite failed' });
				await this.log.error(
					'upload',
					'Uploaded but link rewrite failed',
					path,
				);
				new Notice(
					'Uploaded but link rewrite failed — check activity log',
				);
				return;
			}

			await this.index.saveUpload(record);
			this.reference.trackTouchedNote(rewritten);
			await this.applyPostUpload(path);
			update({ status: 'done' });
			await this.log.info(
				'upload',
				'Upload complete',
				`${path} → ${publicUrl}`,
			);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			update({ status: 'error', message: msg });
			await this.log.error('upload', 'Upload failed', `${path}: ${msg}`);
			throw e;
		}
	}

	private async applyPostUpload(localPath: string): Promise<void> {
		const action = this.settings.get().postUploadLocalAction;
		switch (action) {
			case 'move-trash':
				await this.vault.moveToTrash(localPath);
				break;
			case 'move-folder': {
				const folder = this.settings.get().postUploadMoveFolder;
				if (folder) await this.vault.moveToFolder(localPath, folder);
				break;
			}
			case 'delete':
				await this.vault.deleteFile(localPath);
				break;
			default:
				break;
		}
	}

	isUploading(): boolean {
		return this.uploading;
	}
}
