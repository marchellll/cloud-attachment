import type { Plugin } from 'obsidian';
import type {
	CloudAttachmentSettings,
	PostUploadLocalAction,
	ReferenceScanSchedule,
} from '../settings';
import { DEFAULT_SETTINGS } from '../settings';
import type {
	DuplicateGroup,
	IUploadIndexRepo,
	PluginData,
	QueueItem,
	RefSyncBatch,
	UploadRecord,
} from '../types';
import { createEmptyPluginData, PLUGIN_DATA_VERSION } from '../types';

function migrate(data: Partial<PluginData>): PluginData {
	const base = createEmptyPluginData();
	const merged: PluginData = {
		...base,
		...data,
		uploads: data.uploads ?? {},
		byContentHash: data.byContentHash ?? {},
		byLocalPath: data.byLocalPath ?? {},
		noteRefs: data.noteRefs ?? {},
		queue: data.queue ?? [],
		logs: data.logs ?? [],
		dataVersion: data.dataVersion ?? 0,
	};
	if (merged.dataVersion < PLUGIN_DATA_VERSION) {
		merged.dataVersion = PLUGIN_DATA_VERSION;
	}
	recomputeTotalBytes(merged);
	return merged;
}

const POST_UPLOAD_ACTIONS = new Set<PostUploadLocalAction>([
	'keep',
	'move-trash',
	'move-folder',
	'delete',
]);
const REFERENCE_SCHEDULES = new Set<ReferenceScanSchedule>([
	'daily',
	'weekly',
	'monthly',
]);

function sanitizeSettings(
	raw: Partial<CloudAttachmentSettings> | undefined,
): CloudAttachmentSettings {
	const merged = { ...DEFAULT_SETTINGS, ...raw };
	if (!Array.isArray(merged.watchFolders)) {
		merged.watchFolders = DEFAULT_SETTINGS.watchFolders;
	}
	if (!POST_UPLOAD_ACTIONS.has(merged.postUploadLocalAction)) {
		merged.postUploadLocalAction = DEFAULT_SETTINGS.postUploadLocalAction;
	}
	if (!REFERENCE_SCHEDULES.has(merged.referenceScanSchedule)) {
		merged.referenceScanSchedule = DEFAULT_SETTINGS.referenceScanSchedule;
	}
	return merged;
}

function recomputeTotalBytes(data: PluginData): void {
	let total = 0;
	for (const rec of Object.values(data.uploads)) {
		total += rec.size;
	}
	data.totalBytesCached = total;
}

export class PluginDataRepo implements IUploadIndexRepo {
	private data: PluginData;
	private settings: CloudAttachmentSettings;
	private saveChain: Promise<void> = Promise.resolve();

	constructor(private plugin: Plugin) {
		this.data = createEmptyPluginData();
		this.settings = { ...DEFAULT_SETTINGS };
	}

	getSettings(): CloudAttachmentSettings {
		return this.settings;
	}

	async setSettings(partial: Partial<CloudAttachmentSettings>): Promise<void> {
		this.settings = { ...this.settings, ...partial };
		await this.persist();
	}

	async load(): Promise<void> {
		const raw = (await this.plugin.loadData()) as Partial<PluginData> & {
			settings?: Partial<CloudAttachmentSettings>;
		} | null;
		this.settings = sanitizeSettings(raw?.settings);
		this.data = migrate(raw ?? {});
	}

	private async persist(): Promise<void> {
		await this.plugin.saveData({
			...this.data,
			settings: this.settings,
		});
	}

	private enqueuePersist(fn: (d: PluginData) => void): Promise<void> {
		this.saveChain = this.saveChain.then(async () => {
			fn(this.data);
			await this.persist();
		});
		return this.saveChain;
	}

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
		await this.enqueuePersist((d) => {
			d.uploads[record.cloudKey] = record;
			d.byContentHash[record.contentHash] = record.cloudKey;
			if (record.localPath) {
				d.byLocalPath[record.localPath] = record.cloudKey;
			}
			for (const p of record.localPaths ?? []) {
				d.byLocalPath[p] = record.cloudKey;
			}
			recomputeTotalBytes(d);
		});
	}

	async removeUpload(key: string): Promise<void> {
		await this.enqueuePersist((d) => {
			const rec = d.uploads[key];
			if (!rec) return;
			delete d.uploads[key];
			delete d.byContentHash[rec.contentHash];
			if (rec.localPath) delete d.byLocalPath[rec.localPath];
			for (const p of rec.localPaths ?? []) {
				delete d.byLocalPath[p];
			}
			recomputeTotalBytes(d);
		});
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
			const wastedBytes =
				records.reduce((s, r) => s + r.size, 0) -
				(records[0]?.size ?? 0);
			groups.push({ contentHash, records, wastedBytes });
		}
		return groups;
	}

	async saveRefSyncBatch(patch: RefSyncBatch): Promise<void> {
		await this.enqueuePersist((d) => {
			for (const [path, keys] of Object.entries(patch.noteRefs)) {
				d.noteRefs[path] = keys;
			}
			for (const rec of patch.updatedRecords) {
				d.uploads[rec.cloudKey] = rec;
			}
		});
	}

	getNoteRefs(): Record<string, string[]> {
		return this.data.noteRefs;
	}

	getQueue(): QueueItem[] {
		return [...this.data.queue];
	}

	async enqueue(item: QueueItem): Promise<void> {
		await this.enqueuePersist((d) => {
			d.queue = d.queue.filter((q) => q.localPath !== item.localPath);
			d.queue.push(item);
		});
	}

	async dequeue(localPath: string): Promise<void> {
		await this.enqueuePersist((d) => {
			d.queue = d.queue.filter((q) => q.localPath !== localPath);
		});
	}

	getCachedTotalBytes(): number {
		return this.data.totalBytesCached;
	}

	async setTotalBytesCached(bytes: number): Promise<void> {
		await this.enqueuePersist((d) => {
			d.totalBytesCached = bytes;
		});
	}

	async updateLastReferenceScanAt(iso: string): Promise<void> {
		await this.enqueuePersist((d) => {
			d.lastReferenceScanAt = iso;
		});
	}

	getLogs() {
		return this.data.logs;
	}

	async mutateLogs(fn: (logs: PluginData['logs']) => void): Promise<void> {
		await this.enqueuePersist((d) => {
			fn(d.logs);
		});
	}
}
