import {createLogger, globalAlwatr, type AlwatrLogger} from '@alwatr/logger';

import type {StringifyableRecord} from '@alwatr/type';

globalAlwatr.registeredList.push({
  name: '@alwatr/fsm',
  version: _ALWATR_VERSION_,
});

export interface StateConfig extends StringifyableRecord {
  /**
   * An object mapping event name (keys) to state name
   */
  on: Record<string, string | undefined>;
}

export interface MachineConfig extends StringifyableRecord {
  /**
   * Machine ID.
   */
  id: string;

  /**
   * Initial state name.
   */
  initial: string;

  /**
   * States list
   */
  states: Record<string, StateConfig | undefined>;
}

export class FiniteStateMachine {
  currentState;
  protected _logger: AlwatrLogger;

  constructor(public config: MachineConfig) {
    this._logger = createLogger(`alwatr/fsm ${config.id}`);
    this._logger.logMethodArgs('constructor', config);
    this.currentState = config.initial;
    if (this.currentState in config.states === false) {
      this._logger.error('constructor', 'invalid_initial_state', config);
    }
  }

  /**
   *
   * @param eventName
   */
  transition(eventName: string): string {
    this._logger.logMethodArgs('transition', eventName);
    const nextState = this.config.states[this.currentState]?.on[eventName];
    if (nextState) {
      this.currentState = nextState;
    }
    else {
      this._logger.accident(
          'transition',
          'invalid_target_state',
          'Defined target state for this event not found in state config',
          {
            currentState: this.currentState,
            eventName,
            stateConfig: this.config.states[this.currentState],
          },
      );
    }
    return this.currentState;
  }
}
