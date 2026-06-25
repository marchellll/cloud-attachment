import { App, TFile, TFolder, normalizePath } from 'obsidian';
import type { IVaultRepo, ReferenceScanResult } from '../types';
import { vaultInternalGuard } from './vault-internal-guard';
import { getConfiguredAttachmentFolder } from '../utils/attachment-paths';

function basename(path: string): string {
	return path.split('/').pop() ?? path;
}

function escapeRe(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ObsidianVaultRepo implements IVaultRepo {
	constructor(private app: App) {}

	async readBinary(path: string): Promise<ArrayBuffer> {
		const buf = await this.app.vault.adapter.readBinary(path);
		return buf;
	}

	getAttachmentFolder(): string {
		return getConfiguredAttachmentFolder(this.app);
	}

	listFilesInFolder(folder: string): string[] {
		const af = this.app.vault.getAbstractFileByPath(folder);
		if (!(af instanceof TFolder)) {
			return [];
		}
		const out: string[] = [];
		const walk = (dir: TFolder) => {
			for (const ch of dir.children) {
				if (ch instanceof TFile) {
					out.push(ch.path);
				} else if (ch instanceof TFolder) {
					walk(ch);
				}
			}
		};
		walk(af);
		return out;
	}

	listMarkdownAndCanvas(): string[] {
		return this.app.vault
			.getMarkdownFiles()
			.map((f) => f.path)
			.concat(
				this.app.vault
					.getFiles()
					.filter((f) => f.path.endsWith('.canvas'))
					.map((f) => f.path),
			);
	}

	async readNoteContent(path: string): Promise<string> {
		const f = this.app.vault.getAbstractFileByPath(path);
		if (!(f instanceof TFile)) {
			return '';
		}
		return this.app.vault.read(f);
	}

	async rewriteNoteLinks(
		localPath: string,
		publicUrl: string,
	): Promise<string[]> {
		const name = basename(localPath);
		const modified: string[] = [];
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			const content = await this.app.vault.read(file);
			let next = content;
			const wikiRe = new RegExp(
				`!\\[\\[${escapeRe(name)}(\\|[^\\]]*)?\\]\\]`,
				'g',
			);
			next = next.replace(wikiRe, `![](${publicUrl})`);
			const mdRe = new RegExp(
				`!\\[[^\\]]*\\]\\([^)]*${escapeRe(name)}[^)]*\\)`,
				'g',
			);
			next = next.replace(mdRe, `![](${publicUrl})`);
			if (next !== content) {
				vaultInternalGuard.markPluginWrite([file.path]);
				await this.app.vault.modify(file, next);
				modified.push(file.path);
			}
		}
		if (localPath.endsWith('.canvas')) {
			const canvasModified = await this.rewriteCanvasFile(
				localPath,
				localPath,
				publicUrl,
			);
			if (canvasModified) modified.push(localPath);
		}
		for (const canvasPath of this.app.vault
			.getFiles()
			.filter((f) => f.path.endsWith('.canvas'))
			.map((f) => f.path)) {
			if (await this.rewriteCanvasFile(canvasPath, localPath, publicUrl)) {
				modified.push(canvasPath);
			}
		}
		return [...new Set(modified)];
	}

	private async rewriteCanvasFile(
		canvasPath: string,
		localPath: string,
		publicUrl: string,
	): Promise<boolean> {
		const f = this.app.vault.getAbstractFileByPath(canvasPath);
		if (!(f instanceof TFile)) return false;
		const content = await this.app.vault.read(f);
		try {
			const data = JSON.parse(content) as {
				nodes?: { type?: string; file?: string; url?: string }[];
			};
			let changed = false;
			for (const node of data.nodes ?? []) {
				if (node.file === localPath || basename(node.file ?? '') === basename(localPath)) {
					node.url = publicUrl;
					delete node.file;
					changed = true;
				}
			}
			if (changed) {
				vaultInternalGuard.markPluginWrite([canvasPath]);
				await this.app.vault.modify(f, JSON.stringify(data, null, 2));
				return true;
			}
		} catch {
			// ignore
		}
		return false;
	}

	async scanReferences(
		publicUrl: string,
		localPath?: string,
	): Promise<ReferenceScanResult> {
		const notes: string[] = [];
		const name = localPath ? basename(localPath) : '';
		for (const file of this.app.vault.getMarkdownFiles()) {
			const c = await this.app.vault.read(file);
			if (c.includes(publicUrl) || (name && c.includes(name))) {
				notes.push(file.path);
			}
		}
		for (const path of this.app.vault
			.getFiles()
			.filter((f) => f.path.endsWith('.canvas'))
			.map((f) => f.path)) {
			const c = await this.readNoteContent(path);
			if (c.includes(publicUrl) || (name && c.includes(name))) {
				notes.push(path);
			}
		}
		return { refCount: notes.length, referencingNotes: notes };
	}

	async moveToTrash(path: string): Promise<void> {
		const f = this.app.vault.getAbstractFileByPath(path);
		if (f) {
			await this.app.fileManager.trashFile(f);
		}
	}

	async moveToFolder(path: string, destFolder: string): Promise<void> {
		const dest = normalizePath(`${destFolder}/${basename(path)}`);
		await this.app.vault.adapter.mkdir(destFolder).catch(() => undefined);
		await this.app.vault.adapter.rename(path, dest);
	}

	async deleteFile(path: string): Promise<void> {
		const f = this.app.vault.getAbstractFileByPath(path);
		if (f) {
			await this.app.fileManager.trashFile(f);
		}
	}

	async writeBinary(path: string, data: ArrayBuffer): Promise<void> {
		await this.app.vault.adapter.writeBinary(path, data);
	}
}
