export type PostUploadLocalAction = 'keep' | 'move-trash' | 'move-folder' | 'delete';
export type ReferenceScanSchedule = 'daily' | 'weekly' | 'monthly';

export interface CloudAttachmentSettings {
	endpoint: string;
	region: string;
	bucket: string;
	publicBaseUrl: string;
	forcePathStyle: boolean;
	autoUploadEnabled: boolean;
	watchFolders: string[];
	filenameWhitelistRegex: string;
	filenameBlacklistRegex: string;
	respectGitignore: boolean;
	maxFileSizeBytes: number;
	warnUsageBytes: number;
	stopUsageBytes: number;
	cloudRenameEnabled: boolean;
	postUploadLocalAction: PostUploadLocalAction;
	postUploadMoveFolder: string;
	batchConcurrency: number;
	referenceTrackingEnabled: boolean;
	referenceScanSchedule: ReferenceScanSchedule;
	referenceUpdateDebounceMs: number;
	logRetentionMax: number;
	logDebugEnabled: boolean;
}

export const DEFAULT_SETTINGS: CloudAttachmentSettings = {
	endpoint: '',
	region: 'auto',
	bucket: '',
	publicBaseUrl: '',
	forcePathStyle: true,
	autoUploadEnabled: false,
	watchFolders: [],
	filenameWhitelistRegex:
		'\\.(png|jpe?g|gif|webp|svg|bmp|ico|mp3|wav|ogg|m4a|mp4|webm|mov|avi|mkv)$',
	filenameBlacklistRegex: '',
	respectGitignore: true,
	maxFileSizeBytes: 100 * 1024 * 1024,
	warnUsageBytes: 5000 * 1024 * 1024,
	stopUsageBytes: 9000 * 1024 * 1024,
	cloudRenameEnabled: true,
	postUploadLocalAction: 'keep',
	postUploadMoveFolder: '.trash',
	batchConcurrency: 3,
	referenceTrackingEnabled: false,
	referenceScanSchedule: 'weekly',
	referenceUpdateDebounceMs: 300_000,
	logRetentionMax: 5000,
	logDebugEnabled: false,
};
