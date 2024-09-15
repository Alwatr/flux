import {FluxStateMachineBase} from './base.js';

/**
 * Flux (Finite) State Machine Base Class
 */
export abstract class FluxStateMachine<S extends string, E extends string> extends FluxStateMachineBase<S, E> {
  /**
   * Current state.
   */
  get state(): S {
    return this.message_.state;
  }

  /**
   * Transition flux state machine instance to new state.
   */
  transition(event: E): void {
    this.transition_(event);
  }
}
