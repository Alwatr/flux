import {fetch, type FetchOptions} from '@alwatr/fetch';
import {FiniteStateMachineBase, type StateRecord, type ActionRecord} from '@alwatr/fsm';
import {definePackage} from '@alwatr/logger';

import type {} from '@alwatr/nano-build';

definePackage('@alwatr/fetch-state-machine', __package_version__);

export interface ServerRequestConfig extends Partial<FetchOptions> {
  name: string;
}

export type ServerRequestState = 'initial' | 'loading' | 'failed' | 'complete';
export type ServerRequestEvent = 'request' | 'requestFailed' | 'requestSuccess';

export abstract class AlwatrServerRequestBase<
  ExtraState extends string = never,
  ExtraEvent extends string = never,
> extends FiniteStateMachineBase<ServerRequestState | ExtraState, ServerRequestEvent | ExtraEvent> {
  protected fetchOptions__?: FetchOptions;
  protected response_?: Response;

  protected override stateRecord_ = {
    initial: {
      request: 'loading',
    },
    loading: {
      requestFailed: 'failed',
      requestSuccess: 'complete',
    },
    failed: {
      request: 'loading',
    },
    complete: {
      request: 'loading',
    },
  } as StateRecord<ServerRequestState | ExtraState, ServerRequestEvent | ExtraEvent>;

  protected override actionRecord_ = {
    _on_loading_enter: this.requestAction__,
  } as ActionRecord<ServerRequestState | ExtraState, ServerRequestEvent | ExtraEvent>;

  constructor(protected config_: ServerRequestConfig) {
    super({name: config_.name, initialState: 'initial'});
  }

  protected request_(options?: Partial<FetchOptions>): void {
    this.logger_.logMethodArgs?.('request_', options);
    this.setOptions_(options);
    this.transition_('request');
  }

  protected async fetch__(options: FetchOptions): Promise<void> {
    this.logger_.logMethodArgs?.('fetch__', options);
    this.response_ = await fetch(options);

    if (!this.response_.ok) {
      throw new Error('fetch_nok');
    }
  }

  protected async requestAction__(): Promise<void> {
    this.logger_.logMethod?.('requestAction__');

    try {
      if (this.fetchOptions__ === undefined) {
        throw new Error('invalid_fetch_options');
      }

      await this.fetch__(this.fetchOptions__);

      this.transition_('requestSuccess');
    }
    catch (err) {
      this.logger_.error('requestAction__', 'fetch_failed', err);
      this.transition_('requestFailed');
    }
  }

  protected setOptions_(options?: Partial<FetchOptions>): void {
    this.logger_.logMethodArgs?.('setOptions_', {options});

    const fetchOptions = {
      ...this.config_,
      ...options,
      queryParams: {
        ...this.config_.queryParams,
        ...options?.queryParams,
      },
    };

    if (fetchOptions.url == null) {
      throw new Error('invalid_fetch_options');
    }

    this.fetchOptions__ = fetchOptions as FetchOptions;
  }

  protected override resetToInitialState_(): void {
    super.resetToInitialState_();
    delete this.response_;
  }
}

export class AlwatrServerRequest extends AlwatrServerRequestBase {
  /**
   * Current state.
   */
  get state(): ServerRequestState {
    return this.message_.state;
  }

  get response(): Response | undefined {
    return this.response_;
  }

  request(options?: Partial<FetchOptions>): void {
    return this.request_(options);
  }

  /**
   * Reset the machine to its initial state without notifying, and clean up existing response and state.
   */
  reset(): void {
    this.resetToInitialState_();
  }
}
