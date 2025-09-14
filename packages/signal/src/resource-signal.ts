import {StateSignal} from './state-signal.js';
import type {
  IReadonlySignal,
  ListenerCallback,
  SignalConfig,
  SubscribeOptions,
  SubscribeResult,
} from './type.js';

/**
 * Represents the different states of an asynchronous resource.
 *
 * @template T The type of the data on success.
 * @template E The type of the error on failure.
 */
export type ResourceState<T, E = Error> =
  | { readonly state: 'initial' }
  | { readonly state: 'loading' }
  | { readonly state: 'success'; readonly data: T }
  | { readonly state: 'error'; readonly error: E };

/**
 * Configuration for creating a `ResourceSignal`.
 *
 * @template T The type of the data.
 * @template P The type of the parameters for the async action.
 * @template E The type of the error.
 */
export interface ResourceSignalConfig<T, P, E = Error> extends SignalConfig {
  /**
   * The asynchronous function that fetches the resource.
   * @param {P} params The parameters for the action.
   * @returns {Promise<T>} A promise that resolves with the data.
   */
  readonly action: (params: P) => Promise<T>;
}

/**
 * A signal specialized for managing asynchronous operations and their states.
 *
 * It encapsulates the common state machine for data fetching:
 * `initial` -> `loading` -> `success` | `error`.
 *
 * @template T The type of the data to fetch.
 * @template P The type of the parameters required by the async action.
 * @template E The type of the error.
 */
export class ResourceSignal<T, P, E = Error> implements IReadonlySignal<ResourceState<T, E>> {
  private readonly _stateSignal: StateSignal<ResourceState<T, E>>;
  private readonly _asyncAction: (params: P) => Promise<T>;
  private _lastParams: P | undefined;

  constructor(config: ResourceSignalConfig<T, P, E>) {
    this._stateSignal = new StateSignal({
      signalId: `${config.signalId}-state`,
      initialValue: {state: 'initial'} as ResourceState<T, E>,
    });
    this._asyncAction = config.action;
  }

  /**
   * The current state of the resource.
   */
  get value(): ResourceState<T, E> {
    return this._stateSignal.value;
  }

  /**
   * Indicates whether the signal has been destroyed.
   */
  get isDestroyed(): boolean {
    return this._stateSignal.isDestroyed;
  }

  /**
   * Subscribes a listener to the resource's state changes.
   *
   * @param {ListenerCallback<ResourceState<T, E>>} callback The listener function.
   * @param {SubscribeOptions} [options] Subscription options.
   * @returns {SubscribeResult} An object with an `unsubscribe` method.
   */
  subscribe(
      callback: ListenerCallback<ResourceState<T, E>>,
      options?: SubscribeOptions,
  ): SubscribeResult {
    return this._stateSignal.subscribe(callback, options);
  }

  /**
   * Returns a promise that resolves with the next state change.
   *
   * @returns {Promise<ResourceState<T, E>>} A promise resolving to the next state.
   */
  untilNext(): Promise<ResourceState<T, E>> {
    return this._stateSignal.untilNext();
  }

  /**
   * Destroys the signal, cleaning up internal resources.
   */
  destroy(): void {
    this._stateSignal.destroy();
  }

  /**
   * Triggers the asynchronous action to fetch the resource.
   * Prevents concurrent executions if a request is already in flight.
   *
   * @param {P} params The parameters for the async action.
   */
  trigger(params: P): Promise<void> {
    if (this._stateSignal.value.state === 'loading') {
      return Promise.resolve();
    }

    this._lastParams = params;
    this._stateSignal.set({state: 'loading'});

    return this._asyncAction(params)
        .then((data) => {
          this._stateSignal.set({state: 'success', data});
        })
        .catch((err) => {
          this._stateSignal.set({state: 'error', error: err as E});
        });
  }

  /**
   * Retries the last trigger action with the same parameters.
   * Does nothing if `trigger` has not been called before.
   */
  async retry(): Promise<void> {
    if (this._lastParams === undefined) {
      return;
    }
    await this.trigger(this._lastParams);
  }
}
