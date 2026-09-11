import { store } from '../db/store';
import { CloudBackupRecord, CloudBackupStatus } from '../types';

class CloudBackupService {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number = 12 * 60 * 60 * 1000; // default 12 hours
  private nextRunTimestamp: number | null = null;
  private isRunning: boolean = false;

  constructor() {
    // Initial automated backup schedule
    this.scheduleNextRun(60 * 1000); // initial run 1 minute after server boot
  }

  private scheduleNextRun(delayMs: number): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.nextRunTimestamp = Date.now() + delayMs;
    this.timer = setTimeout(async () => {
      await this.runAutomatedBackup();
      this.scheduleNextRun(this.intervalMs);
    }, delayMs);
  }

  /**
   * Executes the automated cloud backup routine, strictly respecting
   * conversation-level and message-level 'disableAutoBackup' flags.
   */
  public async runAutomatedBackup(): Promise<CloudBackupRecord> {
    if (this.isRunning) {
      const latest = store.getLatestCloudBackup();
      if (latest) return latest;
    }

    this.isRunning = true;
    try {
      console.log('[CloudBackupService] Initiating scheduled automated cloud backup...');
      const record = store.performAutomatedCloudBackup(true);
      console.log(
        `[CloudBackupService] Automated cloud backup ${record.backupId} completed. ` +
        `Eligible conversations backed up: ${record.backedUpConversations}. ` +
        `Conversations excluded due to 'disableAutoBackup': ${record.excludedDueToDisableAutoBackup}. ` +
        `Messages backed up: ${record.totalMessagesBackedUp}.`
      );
      return record;
    } catch (err: any) {
      console.error('[CloudBackupService] Error during automated cloud backup:', err);
      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Allows manual / on-demand trigger of the automated cloud backup logic.
   */
  public async triggerManualBackup(): Promise<CloudBackupRecord> {
    this.isRunning = true;
    try {
      console.log('[CloudBackupService] Initiating on-demand cloud backup...');
      const record = store.performAutomatedCloudBackup(false);
      console.log(
        `[CloudBackupService] On-demand cloud backup ${record.backupId} completed. ` +
        `Eligible conversations backed up: ${record.backedUpConversations}. ` +
        `Excluded conversations (disableAutoBackup): ${record.excludedDueToDisableAutoBackup}.`
      );
      return record;
    } finally {
      this.isRunning = false;
    }
  }

  public getStatus(): CloudBackupStatus & { isRunning: boolean; intervalHours: number } {
    const baseStatus = store.getCloudBackupStatus();
    return {
      ...baseStatus,
      isRunning: this.isRunning,
      intervalHours: Math.round(this.intervalMs / (1000 * 60 * 60)),
      nextScheduledBackup: this.nextRunTimestamp ? new Date(this.nextRunTimestamp).toISOString() : undefined
    };
  }

  public getHistory(): CloudBackupRecord[] {
    return store.getCloudBackupHistory();
  }

  public stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.nextRunTimestamp = null;
  }
}

export const cloudBackupService = new CloudBackupService();
