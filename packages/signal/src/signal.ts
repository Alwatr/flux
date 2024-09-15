import {AlwatrObservable} from './observable.js';

/**
 * Alwatr event signal.
 */
export class AlwatrSignal<T> extends AlwatrObservable<T> {
  constructor(config: {name: string; loggerPrefix?: string}) {
    config.loggerPrefix ??= 'signal';
    super(config);
  }

  /**
   * Dispatch an event to all listeners.
   */
  notify(detail: T): void {
    this.notify_(detail);
  }

  /**
   * Wait until next event.
   */
  untilNewNotify(): Promise<T> {
    return super.untilNewNotify_();
  }
}
