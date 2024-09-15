import {AlwatrApiRequestBase} from './api-request.js';

import type {ServerRequestState, ServerRequestEvent, ServerRequestConfig} from './server-request.js';
import type {FetchOptions} from '@alwatr/fetch/type.js';
import type {AlwatrServiceResponse} from '@alwatr/type';

type ExtraState = 'offlineCheck' | 'reloading' | 'reloadingFailed';
export type ServerContextState = ServerRequestState | ExtraState;

type ExtraEvent = 'cacheNotFound';
export type ServerContextEvent = ServerRequestEvent | ExtraEvent;

export abstract class AlwatrServerContextBase<
  T extends AlwatrServiceResponse = AlwatrServiceResponse,
> extends AlwatrApiRequestBase<T, ExtraState, ExtraEvent> {
  protected _context?: T;
  constructor(protected override config_: ServerRequestConfig) {
    super(config_);

    this.stateRecord_ = {
      initial: {
        request: 'offlineCheck',
      },
      /**
       * Just check offline cache data before online request.
       */
      offlineCheck: {
        requestFailed: 'failed',
        cacheNotFound: 'loading',
        requestSuccess: 'reloading',
      },
      /**
       * First loading without any cached context.
       */
      loading: {
        requestFailed: 'failed',
        requestSuccess: 'complete',
      },
      /**
       * First loading failed without any cached context.
       */
      failed: {
        request: 'offlineCheck',
      },
      reloading: {
        requestFailed: 'reloadingFailed',
        requestSuccess: 'complete',
      },
      /**
       * Reloading failed with previously cached context exist.
       */
      reloadingFailed: {
        request: 'reloading',
      },
      complete: {
        request: 'reloading',
      },
    };

    this.actionRecord_ = {
      _on_offlineCheck_enter: this._$offlineRequestAction,
      _on_loading_enter: this._$onlineRequestAction,
      _on_reloading_enter: this._$onlineRequestAction,
      _on_requestSuccess: this._$updateContextAction,
    };
  }

  protected _$offlineRequestAction(): void {
    this.logger_.logMethod?.('_$offlineRequestAction');
    this.fetchOptions__!.cacheStrategy === 'cache_only';
    this.requestAction__();
  }

  protected _$onlineRequestAction(): void {
    this.logger_.logMethod?.('_$onlineRequestAction');
    this.fetchOptions__!.cacheStrategy === 'update_cache';
    this.requestAction__();
  }

  protected _$updateContextAction(): void {
    if (this._responseJson === undefined) {
      this.logger_.accident('_$updateContextAction', 'no_response_json');
      return;
    }

    this.logger_.logMethod?.('_$updateContextAction');

    if (
      this._context === undefined ||
      this._responseJson.meta?.lastUpdated === undefined ||
      this._responseJson.meta.lastUpdated !== this._context.meta?.lastUpdated
    ) {
      this._context = this._responseJson;
    }

    this._cleanup();
  }

  protected override async requestAction__(): Promise<void> {
    this.logger_.logMethod?.('_$requestAction');

    try {
      if (this.fetchOptions__ === undefined) {
        throw new Error('invalid_fetch_options');
      }

      await this.fetch__(this.fetchOptions__);

      this._transition('requestSuccess');
    }
    catch (err) {
      if ((err as Error).message === 'fetch_cache_not_found') {
        this._transition('cacheNotFound');
      }
      else {
        this.logger_.error('_$requestAction', 'fetch_failed', err);
        this._transition('requestFailed');
      }
    }
  }

  protected _cleanup(): void {
    delete this.response_;
    delete this._responseJson;
  }
}

export class AlwatrServerContext<
  T extends AlwatrServiceResponse = AlwatrServiceResponse,
> extends AlwatrServerContextBase<T> {
  /**
   * Current state.
   */
  get state(): ServerContextState {
    return this._state;
  }

  get context(): T | undefined {
    return this._context;
  }

  request(options?: Partial<FetchOptions>): void {
    return this.request_(options);
  }
}
