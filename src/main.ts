import { Plugin } from 'obsidian';
import { AppContext } from './app-context';
import { registerCommands } from './commands';
import { CloudAttachmentSettingTab } from './ui/settings-tab';
import { StorageView, STORAGE_VIEW_TYPE, activateStorageView } from './ui/storage-view';
import { LogView, LOG_VIEW_TYPE, closeSidebarLogLeaves } from './ui/log-view';
import { registerUploadIndicator } from './ui/upload-indicator';
import { registerAutoUpload } from './utils/events/auto-upload';
import { registerQueueDrain } from './utils/events/queue-drain';
import { registerReferenceDebounce } from './utils/events/reference-debounce';
import { registerReferenceScanScheduler } from './utils/events/reference-scan-scheduler';

export default class CloudAttachmentPlugin extends Plugin {
	ctx!: AppContext;

	async onload(): Promise<void> {
		this.ctx = new AppContext(this.app, this);
		await this.ctx.init();

		this.registerView(STORAGE_VIEW_TYPE, (leaf) => {
			const view = new StorageView(leaf);
			view.setContext(this.ctx);
			return view;
		});
		this.registerView(LOG_VIEW_TYPE, (leaf) => {
			const view = new LogView(leaf);
			view.setContext(this.ctx);
			return view;
		});
		closeSidebarLogLeaves(this.app);

		registerUploadIndicator(this, this.ctx);

		this.addRibbonIcon('upload-cloud', 'Cloud storage', () => {
			void activateStorageView(this.app, this.ctx);
		});

		registerCommands(this, this.ctx);
		registerAutoUpload(this, this.ctx);
		registerQueueDrain(this, this.ctx);
		registerReferenceDebounce(this, this.ctx);
		registerReferenceScanScheduler(this, this.ctx);

		this.addSettingTab(
			new CloudAttachmentSettingTab(this.app, this, this.ctx),
		);
	}

	onunload(): void {
		void this.ctx.log.debug('system', 'Plugin unloaded');
	}
}
