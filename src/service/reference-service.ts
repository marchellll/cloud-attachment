import type { ISettingsRepo, IUploadIndexRepo, IVaultRepo, UploadRecord } from '../types';
import {
	createRefIndexContext,
	extractCloudKeys,
	setsEqual,
} from '../utils/reference-extractor';
import type { LogService } from './log-service';

export class ReferenceService {
	private pendingRefNotes = new Set<string>();
	private uploadBatchNotes = new Set<string>();
	private debounceTimer: number | null = null;

	constructor(
		private index: IUploadIndexRepo,
		private vault: IVaultRepo,
		private settings: ISettingsRepo,
		private log: LogService,
	) {}

	isTrackingEnabled(): boolean {
		return this.settings.get().referenceTrackingEnabled;
	}

	beginUploadBatch(): void {
		this.uploadBatchNotes.clear();
	}

	trackTouchedNote(paths: string[]): void {
		for (const p of paths) {
			this.uploadBatchNotes.add(p);
		}
	}

	async endUploadBatch(): Promise<void> {
		if (!this.isTrackingEnabled()) return;
		await this.syncNotesBulk([...this.uploadBatchNotes]);
		this.uploadBatchNotes.clear();
	}

	queueNoteRefUpdate(notePath: string): void {
		if (!this.isTrackingEnabled()) return;
		this.pendingRefNotes.add(notePath);
		const ms = this.settings.get().referenceUpdateDebounceMs;
		if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
		this.debounceTimer = window.setTimeout(() => {
			void this.flushPendingRefUpdates();
		}, ms);
	}

	async flushPendingRefUpdates(): Promise<void> {
		const paths = [...this.pendingRefNotes];
		this.pendingRefNotes.clear();
		if (paths.length) {
			await this.syncNotesBulk(paths);
		}
	}

	async handleNoteDeleted(notePath: string): Promise<void> {
		if (!this.isTrackingEnabled()) return;
		const noteRefs = this.index.getNoteRefs();
		const keys = noteRefs[notePath] ?? [];
		if (!keys.length) return;
		const updated: UploadRecord[] = [];
		for (const cloudKey of keys) {
			const rec = this.index.getUpload(cloudKey);
			if (!rec) continue;
			const referencingNotes = rec.referencingNotes.filter((p) => p !== notePath);
			updated.push({
				...rec,
				referencingNotes,
				refCount: referencingNotes.length,
				refCountUpdatedAt: new Date().toISOString(),
			});
		}
		const patch = { updatedRecords: updated, noteRefs: { [notePath]: [] } };
		await this.index.saveRefSyncBatch(patch);
	}

	async syncNotesBulk(notePaths: string[]): Promise<void> {
		const unique = [...new Set(notePaths)];
		const ctx = createRefIndexContext(this.index);
		const noteRefsPatch: Record<string, string[]> = {};
		const recordPatches = new Map<string, UploadRecord>();

		for (const path of unique) {
			const content = await this.vault.readNoteContent(path);
			if (!content && !this.index.getNoteRefs()[path]) continue;
			const newKeys = content ? extractCloudKeys(path, content, ctx) : [];
			const oldKeys = this.index.getNoteRefs()[path] ?? [];
			if (setsEqual(newKeys, oldKeys)) continue;
			noteRefsPatch[path] = newKeys;
			const added = newKeys.filter((k) => !oldKeys.includes(k));
			const removed = oldKeys.filter((k) => !newKeys.includes(k));
			for (const cloudKey of added) {
				this.patchRecord(recordPatches, cloudKey, path, true);
			}
			for (const cloudKey of removed) {
				this.patchRecord(recordPatches, cloudKey, path, false);
			}
		}

		if (!Object.keys(noteRefsPatch).length && !recordPatches.size) {
			return;
		}

		await this.index.saveRefSyncBatch({
			noteRefs: noteRefsPatch,
			updatedRecords: [...recordPatches.values()],
		});
		await this.log.info(
			'reference',
			'Reference sync complete',
			`${Object.keys(noteRefsPatch).length} notes, ${recordPatches.size} records`,
		);
	}

	private patchRecord(
		map: Map<string, UploadRecord>,
		cloudKey: string,
		notePath: string,
		add: boolean,
	): void {
		const existing = map.get(cloudKey) ?? this.index.getUpload(cloudKey);
		if (!existing) return;
		let notes = [...(existing.referencingNotes ?? [])];
		if (add) {
			if (!notes.includes(notePath)) notes.push(notePath);
		} else {
			notes = notes.filter((p) => p !== notePath);
		}
		map.set(cloudKey, {
			...existing,
			referencingNotes: notes,
			refCount: notes.length,
			refCountUpdatedAt: new Date().toISOString(),
		});
	}

	async scanAll(): Promise<{ files: number; orphans: number }> {
		const ctx = createRefIndexContext(this.index);
		const allPaths = this.vault.listMarkdownAndCanvas();
		const noteRefs: Record<string, string[]> = {};
		const recordMap = new Map<string, Set<string>>();

		for (const path of allPaths) {
			const content = await this.vault.readNoteContent(path);
			const keys = extractCloudKeys(path, content, ctx);
			noteRefs[path] = keys;
			for (const k of keys) {
				const set = recordMap.get(k) ?? new Set();
				set.add(path);
				recordMap.set(k, set);
			}
		}

		const updatedRecords: UploadRecord[] = [];
		let orphans = 0;
		for (const rec of this.index.getAllUploads()) {
			const notes = [...(recordMap.get(rec.cloudKey) ?? [])];
			if (notes.length === 0) orphans++;
			updatedRecords.push({
				...rec,
				referencingNotes: notes,
				refCount: notes.length,
				refCountUpdatedAt: new Date().toISOString(),
			});
		}

		await this.index.saveRefSyncBatch({ noteRefs, updatedRecords });
		await this.index.updateLastReferenceScanAt(new Date().toISOString());
		return { files: allPaths.length, orphans };
	}

	getOrphans(): UploadRecord[] {
		return this.index.getAllUploads().filter((r) => r.refCount === 0);
	}

	findDuplicateGroups() {
		return this.index.getDuplicateGroups();
	}
}
