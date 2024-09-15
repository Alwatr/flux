import {AlwatrObservable, type AlwatrObservableConfig} from '@alwatr/observable';

import {logger} from './logger.js';

import type {Dictionary} from '@alwatr/type-helper';

logger.logModule?.('signal');

/**
 * Alwatr event signal with special message (event detail).
 */
export class AlwatrSignal<T extends Dictionary = Dictionary> extends AlwatrObservable<T> {
  constructor(config: AlwatrObservableConfig) {
    config.loggerPrefix ??= 'signal';
    super(config);
  }

  /**
   * Dispatch an event to all listeners.
   */
  notify(message: T): void {
    this.notify_(message);
  }

  /**
   * Wait until next event.
   */
  untilNewNotify(): Promise<T> {
    return super.untilNewNotify_();
  }
}
