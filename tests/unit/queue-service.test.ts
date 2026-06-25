import { describe, expect, it, vi } from 'vitest';
import { QueueService } from '../../src/service/queue-service';
import { LogService } from '../../src/service/log-service';
import { FakeLogRepo, InMemoryUploadIndexRepo } from '../helpers/fake-repos';
import type { UploadService } from '../../src/service/upload-service';

describe('QueueService', () => {
	it('drains queue on success', async () => {
		const index = new InMemoryUploadIndexRepo();
		await index.enqueue({
			localPath: 'a.png',
			enqueuedAt: new Date().toISOString(),
			attempts: 0,
		});
		const upload = {
			uploadFiles: vi.fn().mockResolvedValue(undefined),
		} as unknown as UploadService;
		const log = new LogService(new FakeLogRepo(), () => ({
			logDebugEnabled: false,
			logRetentionMax: 100,
		} as never));
		const queue = new QueueService(index, log, () => upload);
		await queue.drain();
		expect(upload.uploadFiles).toHaveBeenCalledWith(['a.png']);
		expect(index.getQueue()).toHaveLength(0);
	});
});
