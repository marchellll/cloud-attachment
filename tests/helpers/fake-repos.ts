import { DEFAULT_SETTINGS, type CloudAttachmentSettings } from '../../src/settings';
import type {
	CloudObjectSummary,
	DuplicateGroup,
	ILogRepo,
	ISettingsRepo,
	IUploadIndexRepo,
	IVaultRepo,
	ISecretRepo,
	ICloudStorageRepo,
	LogEntry,
	PluginData,
	QueueItem,
	RefSyncBatch,
	ReferenceScanResult,
	UploadRecord,
} from '../../src/types';
import { createEmptyPluginData } from '../../src/types';

export class InMemoryUploadIndexRepo implements IUploadIndexRepo {
	private data: PluginData = createEmptyPluginData();

	getData(): PluginData {
		return this.data;
	}

	getUpload(key: string): UploadRecord | undefined {
		return this.data.uploads[key];
	}

	getAllUploads(): UploadRecord[] {
		return Object.values(this.data.uploads);
	}

	findByContentHash(hash: string): UploadRecord | undefined {
		const key = this.data.byContentHash[hash];
		return key ? this.data.uploads[key] : undefined;
	}

	findByLocalPath(path: string): UploadRecord | undefined {
		const key = this.data.byLocalPath[path];
		return key ? this.data.uploads[key] : undefined;
	}

	async saveUpload(record: UploadRecord): Promise<void> {
		this.data.uploads[record.cloudKey] = record;
		this.data.byContentHash[record.contentHash] = record.cloudKey;
		if (record.localPath) {
			this.data.byLocalPath[record.localPath] = record.cloudKey;
		}
		for (const p of record.localPaths ?? []) {
			this.data.byLocalPath[p] = record.cloudKey;
		}
		let total = 0;
		for (const r of Object.values(this.data.uploads)) total += r.size;
		this.data.totalBytesCached = total;
	}

	async removeUpload(key: string): Promise<void> {
		const rec = this.data.uploads[key];
		if (!rec) return;
		delete this.data.uploads[key];
		delete this.data.byContentHash[rec.contentHash];
		if (rec.localPath) delete this.data.byLocalPath[rec.localPath];
		for (const p of rec.localPaths ?? []) delete this.data.byLocalPath[p];
	}

	getDuplicateGroups(): DuplicateGroup[] {
		const byHash = new Map<string, UploadRecord[]>();
		for (const rec of Object.values(this.data.uploads)) {
			const list = byHash.get(rec.contentHash) ?? [];
			list.push(rec);
			byHash.set(rec.contentHash, list);
		}
		const groups: DuplicateGroup[] = [];
		for (const [contentHash, records] of byHash) {
			if (records.length <= 1) continue;
			groups.push({
				contentHash,
				records,
				wastedBytes:
					records.reduce((s, r) => s + r.size, 0) - (records[0]?.size ?? 0),
			});
		}
		return groups;
	}

	async saveRefSyncBatch(patch: RefSyncBatch): Promise<void> {
		Object.assign(this.data.noteRefs, patch.noteRefs);
		for (const rec of patch.updatedRecords) {
			this.data.uploads[rec.cloudKey] = rec;
		}
	}

	getNoteRefs(): Record<string, string[]> {
		return this.data.noteRefs;
	}

	getQueue(): QueueItem[] {
		return [...this.data.queue];
	}

	async enqueue(item: QueueItem): Promise<void> {
		this.data.queue = this.data.queue.filter((q) => q.localPath !== item.localPath);
		this.data.queue.push(item);
	}

	async dequeue(localPath: string): Promise<void> {
		this.data.queue = this.data.queue.filter((q) => q.localPath !== localPath);
	}

	getCachedTotalBytes(): number {
		return this.data.totalBytesCached;
	}

	async setTotalBytesCached(bytes: number): Promise<void> {
		this.data.totalBytesCached = bytes;
	}

	async updateLastReferenceScanAt(iso: string): Promise<void> {
		this.data.lastReferenceScanAt = iso;
	}
}

export class FakeSettingsRepo implements ISettingsRepo {
	constructor(private settings: CloudAttachmentSettings = { ...DEFAULT_SETTINGS }) {}

	get(): CloudAttachmentSettings {
		return this.settings;
	}

	async set(partial: Partial<CloudAttachmentSettings>): Promise<void> {
		this.settings = { ...this.settings, ...partial };
	}
}

export class FakeSecretRepo implements ISecretRepo {
	constructor(
		private accessKeyId = 'test-key',
		private secretAccessKey = 'test-secret',
	) {}

	async getAccessKeyId(): Promise<string> {
		return this.accessKeyId;
	}

	async getSecretAccessKey(): Promise<string> {
		return this.secretAccessKey;
	}

	async setAccessKeyId(value: string): Promise<void> {
		this.accessKeyId = value;
	}

	async setSecretAccessKey(value: string): Promise<void> {
		this.secretAccessKey = value;
	}

	async hasCredentials(): Promise<boolean> {
		return Boolean(this.accessKeyId && this.secretAccessKey);
	}
}

export class FakeVaultRepo implements IVaultRepo {
	files = new Map<string, ArrayBuffer>();
	notes = new Map<string, string>();
	modified: string[] = [];

	async readBinary(path: string): Promise<ArrayBuffer> {
		const buf = this.files.get(path);
		if (!buf) throw new Error(`missing file ${path}`);
		return buf;
	}

	getAttachmentFolder(): string {
		return 'attachments';
	}

	listFilesInFolder(folder: string): string[] {
		return [...this.files.keys()].filter((p) => p.startsWith(folder + '/'));
	}

	listMarkdownAndCanvas(): string[] {
		return [...this.notes.keys()];
	}

	async rewriteNoteLinks(localPath: string, publicUrl: string): Promise<string[]> {
		const name = localPath.split('/').pop() ?? localPath;
		const modified: string[] = [];
		for (const [path, content] of this.notes) {
			if (!content.includes(name)) continue;
			const next = content.replaceAll(`![[${name}]]`, `![](${publicUrl})`);
			if (next !== content) {
				this.notes.set(path, next);
				modified.push(path);
			}
		}
		this.modified.push(...modified);
		return modified;
	}

	async readNoteContent(path: string): Promise<string> {
		return this.notes.get(path) ?? '';
	}

	async scanReferences(
		publicUrl: string,
		localPath?: string,
	): Promise<ReferenceScanResult> {
		const notes: string[] = [];
		for (const [path, content] of this.notes) {
			if (content.includes(publicUrl)) notes.push(path);
		}
		return { refCount: notes.length, referencingNotes: notes };
	}

	async moveToTrash(_path: string): Promise<void> {}
	async moveToFolder(_path: string, _dest: string): Promise<void> {}
	async deleteFile(path: string): Promise<void> {
		this.files.delete(path);
	}
	async writeBinary(path: string, data: ArrayBuffer): Promise<void> {
		this.files.set(path, data);
	}
}

export class FakeCloudStorageRepo implements ICloudStorageRepo {
	objects = new Map<string, { body: ArrayBuffer; contentType: string }>();

	async testConnection(): Promise<void> {}

	async putObject(
		key: string,
		body: ArrayBuffer,
		contentType: string,
		onProgress?: (pct: number) => void,
	): Promise<void> {
		this.objects.set(key, { body, contentType });
		onProgress?.(100);
	}

	async deleteObject(key: string): Promise<void> {
		this.objects.delete(key);
	}

	async listObjects(): Promise<CloudObjectSummary[]> {
		return [...this.objects.entries()].map(([key, v]) => ({
			key,
			size: v.body.byteLength,
		}));
	}

	async getTotalBytes(): Promise<number> {
		let total = 0;
		for (const v of this.objects.values()) total += v.body.byteLength;
		return total;
	}
}

export class FakeLogRepo implements ILogRepo {
	entries: LogEntry[] = [];

	async append(
		entry: Omit<LogEntry, 'id' | 'at'> & Partial<Pick<LogEntry, 'id' | 'at'>>,
	): Promise<void> {
		this.entries.push({
			id: entry.id ?? '1',
			at: entry.at ?? new Date().toISOString(),
			level: entry.level,
			category: entry.category,
			message: entry.message,
			detail: entry.detail,
		});
	}

	getAll(): LogEntry[] {
		return this.entries;
	}

	async clear(): Promise<void> {
		this.entries = [];
	}
}
