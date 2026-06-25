export class VaultInternalGuard {
	private pluginWritePaths = new Set<string>();

	markPluginWrite(paths: string[]): void {
		for (const p of paths) {
			this.pluginWritePaths.add(p);
		}
	}

	consumePluginWrite(path: string): boolean {
		if (!this.pluginWritePaths.has(path)) {
			return false;
		}
		this.pluginWritePaths.delete(path);
		return true;
	}

	isMarked(path: string): boolean {
		return this.pluginWritePaths.has(path);
	}
}

export const vaultInternalGuard = new VaultInternalGuard();
