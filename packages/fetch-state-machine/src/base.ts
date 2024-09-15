import {fetch, type FetchOptions} from '@alwatr/fetch';
import {AlwatrFluxStateMachineBase, type StateRecord, type ActionRecord} from '@alwatr/fsm';
import {definePackage} from '@alwatr/logger';

import type {} from '@alwatr/nano-build';

definePackage('@alwatr/fetch-state-machine', __package_version__);

export type ServerRequestState = 'initial' | 'loading' | 'failed' | 'complete';
export type ServerRequestEvent = 'request' | 'requestFailed' | 'requestSuccess';

export type {FetchOptions};

export abstract class AlwatrFetchStateMachineBase<
  ExtraState extends string = never,
  ExtraEvent extends string = never,
> extends AlwatrFluxStateMachineBase<ServerRequestState | ExtraState, ServerRequestEvent | ExtraEvent> {
  protected config_: Partial<FetchOptions>;
  protected fetchOptions_?: FetchOptions;
  protected rawResponse_?: Response;

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
    _on_loading_enter: this.requestAction_,
  } as ActionRecord<ServerRequestState | ExtraState, ServerRequestEvent | ExtraEvent>;

  constructor(config: Partial<FetchOptions> & {name: string}) {
    super({name: config.name, initialState: 'initial'});
    this.config_ = config;
  }

  protected request_(options?: Partial<FetchOptions>): void {
    this.logger_.logMethodArgs?.('request_', options);
    this.setOptions_(options);
    this.transition_('request');
  }

  protected async fetch_(options: FetchOptions): Promise<void> {
    this.logger_.logMethodArgs?.('fetch_', options);
    this.rawResponse_ = await fetch(options);

    if (!this.rawResponse_.ok) {
      throw new Error('fetch_nok');
    }
  }

  protected async requestAction_(): Promise<void> {
    this.logger_.logMethod?.('requestAction__');

    try {
      if (this.fetchOptions_ === undefined) {
        throw new Error('invalid_fetch_options');
      }

      await this.fetch_(this.fetchOptions_);

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

    if (fetchOptions.url === undefined) {
      throw new Error('invalid_fetch_options');
    }

    this.fetchOptions_ = fetchOptions as FetchOptions;
  }

  protected override resetToInitialState_(): void {
    super.resetToInitialState_();
    delete this.rawResponse_;
  }
}
