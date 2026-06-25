export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogCategory =
	| 'upload'
	| 'queue'
	| 'reference'
	| 'storage'
	| 'settings'
	| 'system';

export interface LogEntry {
	id: string;
	at: string;
	level: LogLevel;
	category: LogCategory;
	message: string;
	detail?: string;
}

export type LinkStatus = 'ok' | 'pending';

export interface UploadRecord {
	cloudKey: string;
	publicUrl: string;
	contentHash: string;
	size: number;
	uploadedAt: string;
	localPath?: string;
	localPaths?: string[];
	refCount: number;
	referencingNotes: string[];
	refCountUpdatedAt?: string;
	linkStatus?: LinkStatus;
}

export interface QueueItem {
	localPath: string;
	enqueuedAt: string;
	attempts: number;
	lastError?: string;
}

export const MAX_QUEUE_ATTEMPTS = 5;

export interface CloudObjectSummary {
	key: string;
	size: number;
	lastModified?: string;
}

export interface PluginData {
	dataVersion: number;
	uploads: Record<string, UploadRecord>;
	byContentHash: Record<string, string>;
	byLocalPath: Record<string, string>;
	noteRefs: Record<string, string[]>;
	queue: QueueItem[];
	totalBytesCached: number;
	lastReferenceScanAt?: string;
	logs: LogEntry[];
}

export interface RefSyncBatch {
	updatedRecords: UploadRecord[];
	noteRefs: Record<string, string[]>;
}

export interface ReferenceScanResult {
	refCount: number;
	referencingNotes: string[];
}

export interface DuplicateGroup {
	contentHash: string;
	records: UploadRecord[];
	wastedBytes: number;
}

export interface UploadProgress {
	filePath: string;
	status: 'pending' | 'uploading' | 'done' | 'skipped' | 'error';
	percent?: number;
	message?: string;
}

export interface ICloudStorageRepo {
	testConnection(): Promise<void>;
	putObject(
		key: string,
		body: ArrayBuffer,
		contentType: string,
		onProgress?: (pct: number) => void,
	): Promise<void>;
	deleteObject(key: string): Promise<void>;
	listObjects(): Promise<CloudObjectSummary[]>;
	getTotalBytes(): Promise<number>;
}

export interface IUploadIndexRepo {
	getData(): PluginData;
	getUpload(key: string): UploadRecord | undefined;
	getAllUploads(): UploadRecord[];
	findByContentHash(hash: string): UploadRecord | undefined;
	findByLocalPath(path: string): UploadRecord | undefined;
	saveUpload(record: UploadRecord): Promise<void>;
	removeUpload(key: string): Promise<void>;
	getDuplicateGroups(): DuplicateGroup[];
	saveRefSyncBatch(patch: RefSyncBatch): Promise<void>;
	getNoteRefs(): Record<string, string[]>;
	getQueue(): QueueItem[];
	enqueue(item: QueueItem): Promise<void>;
	dequeue(localPath: string): Promise<void>;
	getCachedTotalBytes(): number;
	setTotalBytesCached(bytes: number): Promise<void>;
	updateLastReferenceScanAt(iso: string): Promise<void>;
}

export interface IVaultRepo {
	readBinary(path: string): Promise<ArrayBuffer>;
	getAttachmentFolder(): string;
	listFilesInFolder(folder: string): string[];
	listMarkdownAndCanvas(): string[];
	rewriteNoteLinks(localPath: string, publicUrl: string): Promise<string[]>;
	readNoteContent(path: string): Promise<string>;
	scanReferences(
		publicUrl: string,
		localPath?: string,
	): Promise<ReferenceScanResult>;
	moveToTrash(path: string): Promise<void>;
	moveToFolder(path: string, destFolder: string): Promise<void>;
	deleteFile(path: string): Promise<void>;
	writeBinary(path: string, data: ArrayBuffer): Promise<void>;
}

export interface ISecretRepo {
	getAccessKeyId(): Promise<string>;
	getSecretAccessKey(): Promise<string>;
	setAccessKeyId(value: string): Promise<void>;
	setSecretAccessKey(value: string): Promise<void>;
	hasCredentials(): Promise<boolean>;
}

export interface ISettingsRepo {
	get(): import('./settings').CloudAttachmentSettings;
	set(
		partial: Partial<import('./settings').CloudAttachmentSettings>,
	): Promise<void>;
}

export interface ILogRepo {
	append(
		entry: Omit<LogEntry, 'id' | 'at'> & Partial<Pick<LogEntry, 'id' | 'at'>>,
	): Promise<void>;
	getAll(): LogEntry[];
	clear(): Promise<void>;
}

export const PLUGIN_DATA_VERSION = 1;

export function createEmptyPluginData(): PluginData {
	return {
		dataVersion: PLUGIN_DATA_VERSION,
		uploads: {},
		byContentHash: {},
		byLocalPath: {},
		noteRefs: {},
		queue: [],
		totalBytesCached: 0,
		logs: [],
	};
}
