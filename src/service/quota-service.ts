import type { ISettingsRepo, IUploadIndexRepo } from '../types';
import type { LogService } from './log-service';

export class QuotaService {
	constructor(
		private index: IUploadIndexRepo,
		private settings: ISettingsRepo,
		private log: LogService,
	) {}

	async checkQuota(additionalBytes: number): Promise<void> {
		const s = this.settings.get();
		const total = this.index.getCachedTotalBytes() + additionalBytes;
		if (total >= s.stopUsageBytes) {
			throw new Error('Cloud usage stop threshold reached');
		}
		if (total >= s.warnUsageBytes) {
			await this.log.warn(
				'upload',
				'Cloud usage warning',
				`Usage ${total} bytes approaching limit`,
			);
		}
	}
}
