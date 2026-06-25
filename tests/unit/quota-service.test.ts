import { describe, expect, it } from 'vitest';
import { QuotaService } from '../../src/service/quota-service';
import { LogService } from '../../src/service/log-service';
import {
	FakeLogRepo,
	FakeSettingsRepo,
	InMemoryUploadIndexRepo,
} from '../helpers/fake-repos';
import { DEFAULT_SETTINGS } from '../../src/settings';

describe('QuotaService', () => {
	it('throws when stop threshold exceeded', async () => {
		const index = new InMemoryUploadIndexRepo();
		await index.setTotalBytesCached(DEFAULT_SETTINGS.stopUsageBytes);
		const settings = new FakeSettingsRepo();
		const log = new LogService(new FakeLogRepo(), () => settings.get());
		const quota = new QuotaService(index, settings, log);
		await expect(quota.checkQuota(1)).rejects.toThrow(/stop threshold/);
	});
});
