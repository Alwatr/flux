import {AlwatrObservable, type AlwatrObservableConfig} from '@alwatr/observable';

import type {} from '@alwatr/nano-build';
import type {Dictionary} from '@alwatr/type-helper';

import {definePackage} from '@alwatr/logger';

definePackage('@alwatr/context', __package_version__);

/**
 * Alwatr Context.
 */
export class AlwatrContext<T extends Dictionary> extends AlwatrObservable<T> {
  constructor(config: AlwatrObservableConfig) {
    config.loggerPrefix ??= 'context-signal';
    super(config);
  }

  /**
   * Get context value.
   *
   * Return undefined if context not set before or expired.
   */
  getValue(): T | undefined {
    return this.message_;
  }

  /**
   * Set context value and notify all subscribers.
   */
  setValue(value: T): void {
    this.logger_.logMethodArgs?.('setValue', {value});
    super.notify_(value);
  }

  /**
   * Clear current context value without notify subscribers.
   *
   * `receivePrevious` in new subscribers not work until new context changes.
   */
  expire(): void {
    super.clearMessage_();
  }

  /**
   * Get the value of the next context changes.
   */
  untilChange(): Promise<T> {
    return super.untilNewNotify_();
  }
}
