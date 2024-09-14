import {createLogger, definePackage} from '@alwatr/logger';

import type {SubscribeOptions, ListenerCallback, Observer, SubscribeResult, AlwatrObservableInterface} from './type.js';
import type {} from '@alwatr/nano-build';

definePackage('@alwatr/signal', __package_version__);

/**
 * Alwatr base signal.
 */
export abstract class AlwatrObservable<T> implements AlwatrObservableInterface<T> {
  protected name_;
  protected logger_;
  protected data__?: T;
  protected observers__: Observer<this, T>[] = [];

  constructor(config: {name: string; loggerPrefix?: string}) {
    config.loggerPrefix ??= 'signal';
    this.name_ = config.name;
    this.logger_ = createLogger(`{${config.loggerPrefix}: ${this.name_}}`);
    this.logger_.logMethod?.('constructor');
  }

  /**
   * Get data.
   *
   * Return undefined if signal not notify before or expired.
   */
  protected getData_(): T | undefined {
    this.logger_.logMethodFull?.('getData_', {}, this.data__);
    return this.data__;
  }

  /**
   * Execute all observers and remember data.
   */
  protected notify_(data: T): void {
    this.logger_.logMethodArgs?.('notify_', data);
    this.data__ = data;
    setTimeout(() => this.dispatch__(data), 0);
  }

  /**
   * Execute all observers callback.
   */
  protected dispatch__(data: T): void {
    const removeList: Observer<this, T>[] = [];

    for (const listener of this.observers__) {
      if (listener.options.disabled) continue;
      if (listener.options.once) removeList.push(listener);

      try {
        const ret = listener.callback.call(this, data);
        if (ret instanceof Promise) {
          ret.catch((err) => this.logger_.error('dispatch__', 'call_listener_failed', err));
        }
      }
      catch (err) {
        this.logger_.error('dispatch__', 'call_listener_failed', err);
      }
    }

    for (const listener of removeList) {
      this.unsubscribe(listener.callback);
    }
  }

  /**
   * Subscribe to context changes.
   */
  subscribe(listenerCallback: ListenerCallback<this, T>, options: SubscribeOptions = {}): SubscribeResult {
    this.logger_.logMethodArgs?.('subscribe', {options});

    const listenerObject_: Observer<this, T> = {
      callback: listenerCallback,
      options,
    };

    let callbackExecuted = false;
    const data = this.data__;
    if (data !== undefined && options.receivePrevious === true && options.disabled !== true) {
      // Run callback for old dispatch signal
      callbackExecuted = true;
      setTimeout(() => {
        try {
          const ret = listenerCallback.call(this, data);
          if (ret instanceof Promise) {
            ret.catch((err) => this.logger_.error('subscribe.receivePrevious', 'call_signal_callback_failed', err));
          }
        }
        catch (err) {
          this.logger_.error('subscribe.receivePrevious', 'call_signal_callback_failed', err);
        }
      }, 0);
    }

    // If once then must remove listener after first callback called! then why push it to listenerList?!
    if (options.once !== true || callbackExecuted === true) {
      if (options.priority === true) {
        this.observers__.unshift(listenerObject_);
      }
      else {
        this.observers__.push(listenerObject_);
      }
    }

    return {
      unsubscribe: this.unsubscribe.bind(this, listenerCallback),
    };
  }

  /**
   * Unsubscribe from context.
   */
  unsubscribe(listenerCallback: ListenerCallback<this, T>): void {
    this.logger_.logMethod?.('unsubscribe');
    const listenerIndex = this.observers__.findIndex((listener) => listener.callback === listenerCallback);
    if (listenerIndex !== -1) {
      void this.observers__.splice(listenerIndex, 1);
    }
  }

  /**
   * Clear current data without notify subscribers.
   *
   * `receivePrevious` in new subscribers not work until new a notify changes the data.
   */
  protected clearData_(): void {
    this.logger_.logMethod?.('clear_');
    this.data__ = undefined;
  }

  /**
   * Get the data of next notify.
   */
  protected untilNewNotify_(): Promise<T> {
    this.logger_.logMethod?.('untilNewNotify_');
    return new Promise((resolve) => {
      this.subscribe(resolve, {
        once: true,
        priority: true,
        receivePrevious: false,
      });
    });
  }
}
