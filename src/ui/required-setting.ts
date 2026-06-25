import type { Setting } from 'obsidian';

const ERROR_CLS = 'cloud-attachment-required-error';

export function updateRequiredError(setting: Setting, isEmpty: boolean): void {
	const parent = setting.settingEl;
	let el = parent.querySelector(`.${ERROR_CLS}`);
	if (isEmpty) {
		if (!el) {
			el = parent.createDiv({
				cls: `setting-item-description ${ERROR_CLS}`,
				text: 'Required',
			});
		}
	} else {
		el?.remove();
	}
}
