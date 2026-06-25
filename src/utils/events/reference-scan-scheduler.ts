import type { Plugin } from 'obsidian';
import type { AppContext } from '../../app-context';
import type { ReferenceScanSchedule } from '../../settings';

const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;
const MS_MONTH = 30 * MS_DAY;

function scheduleMs(s: ReferenceScanSchedule): number {
	switch (s) {
		case 'daily':
			return MS_DAY;
		case 'weekly':
			return MS_WEEK;
		case 'monthly':
			return MS_MONTH;
	}
}

export function registerReferenceScanScheduler(
	plugin: Plugin,
	ctx: AppContext,
): void {
	const tick = () => {
		if (!ctx.reference.isTrackingEnabled()) return;
		const last = ctx.dataRepo.getData().lastReferenceScanAt;
		const schedule = ctx.settingsRepo.get().referenceScanSchedule;
		const interval = scheduleMs(schedule);
		if (last) {
			const elapsed = Date.now() - new Date(last).getTime();
			if (elapsed < interval) return;
		}
		void ctx.reference.scanAll();
	};

	plugin.registerInterval(window.setInterval(tick, MS_DAY));
	tick();
}
