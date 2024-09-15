import {AlwatrObservable, type AlwatrObservableConfig} from '@alwatr/observable';

import {logger} from './logger.js';

logger.logModule?.('trigger');

/**
 * Alwatr event signal without any message (no event detail).
 */
export class AlwatrTrigger extends AlwatrObservable {
  constructor(config: AlwatrObservableConfig) {
    config.loggerPrefix ??= 'signal';
    super(config);
  }

  /**
   * Dispatch an event to all listeners.
   */
  notify(): void {
    this.notify_({});
  }

  /**
   * Wait until next event signal.
   */
  async untilTriggered(): Promise<void> {
    await super.untilNewNotify_();
  }
}
