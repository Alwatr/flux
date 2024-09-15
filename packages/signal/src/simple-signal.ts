import {AlwatrObservable} from './observable.js';

/**
 * Alwatr event signal without any message (no event detail).
 */
export class AlwatrSimpleSignal extends AlwatrObservable {
  constructor(config: {name: string; loggerPrefix?: string}) {
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
  async untilNewNotify(): Promise<void> {
    await super.untilNewNotify_();
  }
}
