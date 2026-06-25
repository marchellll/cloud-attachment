import type { AppContext } from '../app-context';
import type { Plugin } from 'obsidian';
import { registerUploadCommands } from './upload-asset-folder';
import { registerScanReferences } from './scan-references';
import { registerFindDuplicates } from './find-duplicates';
import { registerSyncFromBucket } from './sync-from-bucket';
import { registerOpenLog } from './open-log';

export function registerCommands(plugin: Plugin, ctx: AppContext): void {
	registerUploadCommands(plugin, ctx);
	registerScanReferences(plugin, ctx);
	registerFindDuplicates(plugin, ctx);
	registerSyncFromBucket(plugin, ctx);
	registerOpenLog(plugin, ctx);
}
