import type { IVaultRepo } from '../types';
import type { LogService } from './log-service';

export class LinkService {
	constructor(
		private vault: IVaultRepo,
		private log: LogService,
	) {}

	async rewriteLinks(
		localPath: string,
		publicUrl: string,
	): Promise<string[]> {
		try {
			const paths = await this.vault.rewriteNoteLinks(localPath, publicUrl);
			await this.log.info(
				'upload',
				'Links updated',
				`${paths.length} file(s) for ${localPath}`,
			);
			return paths;
		} catch (e) {
			await this.log.error(
				'upload',
				'Link rewrite failed',
				e instanceof Error ? e.message : String(e),
			);
			throw e;
		}
	}
}
