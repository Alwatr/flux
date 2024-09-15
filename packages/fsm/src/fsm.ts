import {FiniteStateMachineBase} from './base.js';

/**
 * Finite State Machine Base Class
 */
export abstract class FiniteStateMachine<S extends string, E extends string> extends FiniteStateMachineBase<S, E> {
  /**
   * Current state.
   */
  get state(): S {
    return this.message_.state;
  }

  /**
   * Transition finite state machine instance to new state.
   */
  transition(event: E): void {
    this.transition_(event);
  }
}
