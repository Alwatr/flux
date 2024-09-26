import {
  AlwatrJsonFetchStateMachineBase,
  type AlwatrFetchStateMachineConfig,
  type ServerRequestEvent,
  type ServerRequestState,
} from '@alwatr/fetch-state-machine';

import type {Json} from '@alwatr/type-helper';

type ExtraState = 'offlineCheck' | 'reloading' | 'reloadingFailed';
export type ServerContextState = ServerRequestState | ExtraState;

type ExtraEvent = 'cacheNotFound';
export type ServerContextEvent = ServerRequestEvent | ExtraEvent;

export type AlwatrRemoteContextStateMachineConfig = AlwatrFetchStateMachineConfig<ServerContextState>;

export abstract class AlwatrRemoteContextStateMachineBase<T extends Json = Json> extends AlwatrJsonFetchStateMachineBase<
  T,
  ExtraState,
  ExtraEvent
> {
  protected context_?: T;

  constructor(config: AlwatrRemoteContextStateMachineConfig) {
    super(config);

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
        request: 'loading', // //TODO: why offlineCheck? should be loading!
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
      on_offlineCheck_enter: this.offlineRequestAction_,
      on_loading_enter: this.onlineRequestAction_,
      on_reloading_enter: this.onlineRequestAction_,
      on_requestSuccess: this.updateContextAction_,
    };
  }

  protected offlineRequestAction_(): void {
    this.logger_.logMethod?.('offlineRequestAction_');
    this.currentFetchOptions_!.cacheStrategy = 'cache_only';
    this.requestAction_();
  }

  protected onlineRequestAction_(): void {
    this.logger_.logMethod?.('onlineRequestAction_');
    this.currentFetchOptions_!.cacheStrategy = 'update_cache';
    this.requestAction_();
  }

  protected updateContextAction_(): void {
    this.logger_.logMethod?.('updateContextAction_');

    if (this.jsonResponse_ === undefined) {
      this.logger_.accident('updateContextAction_', 'no_response_json');
      return;
    }

    this.context_ = this.jsonResponse_;
    this.cleanup_();
  }

  protected override requestFailed_(error: Error): void {
    this.logger_.logMethod?.('requestFailed_');

    if (error.message === 'fetch_cache_not_found') {
      this.transition_('cacheNotFound');
    }
    else {
      super.requestFailed_(error);
    }
  }

  protected cleanup_(): void {
    delete this.rawResponse_;
    delete this.jsonResponse_;
  }
}
