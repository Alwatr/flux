import { AlwatrFetchStateMachineBase, type FetchOptions, type ServerRequestState } from "./base.js";

export class AlwatrFetchStateMachine extends AlwatrFetchStateMachineBase {
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
