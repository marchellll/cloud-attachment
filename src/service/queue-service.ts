import type { IUploadIndexRepo } from '../types';
import { MAX_QUEUE_ATTEMPTS } from '../types';
import type { LogService } from './log-service';
import type { UploadService } from './upload-service';

export class QueueService {
	constructor(
		private index: IUploadIndexRepo,
		private log: LogService,
		private getUploadService: () => UploadService,
	) {}

	async enqueue(localPath: string, error: string): Promise<void> {
		const existing = this.index.getQueue().find((q) => q.localPath === localPath);
		const attempts = (existing?.attempts ?? 0) + 1;
		await this.index.enqueue({
			localPath,
			enqueuedAt: new Date().toISOString(),
			attempts,
			lastError: error,
		});
		await this.log.warn('queue', 'Queued for retry when online', `${localPath}: ${error}`);
	}

	async drain(): Promise<void> {
		const queue = this.index.getQueue();
		if (!queue.length) return;
		await this.log.info('queue', 'Draining offline queue', `${queue.length} item(s)`);
		const upload = this.getUploadService();
		for (const item of queue) {
			if (item.attempts >= MAX_QUEUE_ATTEMPTS) {
				await this.log.error('queue', 'Permanent queue failure', item.localPath);
				await this.index.dequeue(item.localPath);
				continue;
			}
			try {
				await upload.uploadFiles([item.localPath]);
				await this.index.dequeue(item.localPath);
				await this.log.info('queue', 'Queue item uploaded', item.localPath);
			} catch (e) {
				await this.enqueue(
					item.localPath,
					e instanceof Error ? e.message : String(e),
				);
			}
		}
	}
}
