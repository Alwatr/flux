import {FiniteStateMachineBase} from './base.js';

/**
 * Finite State Machine Base Class
 */
export abstract class FiniteStateMachine<S extends string, E extends string> extends FiniteStateMachineBase<S, E> {
  /**
   * Current state.
   */
  getState(): S {
    return this.data_;
  }

  /**
   * Transition finite state machine instance to new state.
   */
  transition(event: E): void {
    this.transition_(event);
  }
}
