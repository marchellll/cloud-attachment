import type { Plugin } from 'obsidian';
import { TFile } from 'obsidian';
import type { AppContext } from '../../app-context';
import { vaultInternalGuard } from '../../repository/vault-internal-guard';

export function registerReferenceDebounce(plugin: Plugin, ctx: AppContext): void {
	plugin.registerEvent(
		plugin.app.vault.on('modify', (file) => {
			if (!(file instanceof TFile)) return;
			if (!ctx.reference.isTrackingEnabled()) return;
			if (vaultInternalGuard.consumePluginWrite(file.path)) return;
			const ext = file.extension.toLowerCase();
			if (ext !== 'md' && ext !== 'canvas') return;
			ctx.reference.queueNoteRefUpdate(file.path);
		}),
	);

	plugin.registerEvent(
		plugin.app.vault.on('delete', (file) => {
			if (!(file instanceof TFile)) return;
			if (!ctx.reference.isTrackingEnabled()) return;
			void ctx.reference.handleNoteDeleted(file.path);
		}),
	);
}
