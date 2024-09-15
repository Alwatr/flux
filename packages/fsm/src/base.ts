import {definePackage} from '@alwatr/logger';
import '@alwatr/polyfill-has-own';
import {AlwatrObservable} from '@alwatr/signal';

import type {ActionName, ActionRecord, StateEventDetail, StateRecord} from './type.js';
import type {} from '@alwatr/nano-build';
import type {MaybePromise} from '@alwatr/type-helper';

definePackage('@alwatr/signal', __package_version__);

/**
 * Finite State Machine Base Class
 */
export abstract class FiniteStateMachineBase<S extends string, E extends string> extends AlwatrObservable<S> {
  /**
   * States and transitions config.
   */
  protected stateRecord_: StateRecord<S, E> = {};

  /**
   * Bind actions name to class methods
   */
  protected actionRecord_: ActionRecord<S, E> = {};

  protected initialState_: S;

  protected override data_: S;

  constructor(config: {name: string; loggerPrefix?: string; initialState: S}) {
    config.loggerPrefix ??= 'fsm';
    super(config);
    this.data_ = this.initialState_ = config.initialState;
  }

  /**
   * Reset machine to initial state.
   */
  protected resetToInitialState_(): void {
    this.logger_.logMethod?.('resetToInitialState_');
    this.data_ = this.initialState_;
  }

  /**
   * Transition condition.
   */
  protected shouldTransition_(_eventDetail: StateEventDetail<S, E>): MaybePromise<boolean> {
    this.logger_.logMethodFull?.('shouldTransition_', _eventDetail, true);
    return true;
  }

  /**
   * Transition finite state machine instance to new state.
   */
  protected async transition_(event: E): Promise<void> {
    const fromState = this.data_;
    const toState = this.stateRecord_[fromState]?.[event] ?? this.stateRecord_._all?.[event];

    this.logger_.logMethodArgs?.('transition_', {fromState, event, toState});

    if (toState == null) {
      this.logger_.incident?.('transition', 'invalid_target_state', {
        fromState,
        event,
      });
      return;
    }

    const eventDetail: StateEventDetail<S, E> = {from: fromState, event, to: toState};

    if ((await this.shouldTransition_(eventDetail)) !== true) return;

    this.notify_(toState);

    this.postTransition__(eventDetail);
  }

  /**
   * Execute all actions for current state.
   */
  protected async postTransition__(eventDetail: StateEventDetail<S, E>): Promise<void> {
    this.logger_.logMethodArgs?.('_transitioned', eventDetail);

    await this.execAction__(`_on_${eventDetail.event}`, eventDetail);

    if (eventDetail.from !== eventDetail.to) {
      await this.execAction__(`_on_state_exit`, eventDetail);
      await this.execAction__(`_on_${eventDetail.from}_exit`, eventDetail);
      await this.execAction__(`_on_state_enter`, eventDetail);
      await this.execAction__(`_on_${eventDetail.to}_enter`, eventDetail);
    }

    if (Object.hasOwn(this, `_on_${eventDetail.from}_${eventDetail.event}`)) {
      this.execAction__(`_on_${eventDetail.from}_${eventDetail.event}`, eventDetail);
    }
    else {
      // The action `all_eventName` is executed only if the action `fromState_eventName` is not defined.
      this.execAction__(`_on_all_${eventDetail.event}`, eventDetail);
    }
  }

  /**
   * Execute action name if defined in _actionRecord.
   */
  protected execAction__(name: ActionName<S, E>, eventDetail: StateEventDetail<S, E>): MaybePromise<void> {
    const actionFn = this.actionRecord_[name];
    if (typeof actionFn === 'function') {
      this.logger_.logMethodArgs?.('_$execAction', name);
      return actionFn.call(this, eventDetail);
    }
  }
}
