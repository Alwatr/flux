export interface StateEventDetail<S, E> {
  from: S;
  event: E;
  to: S;
}

export type StateRecord<S extends string, E extends string> = Partial<Record<S | '_all', Partial<Record<E, S>>>>;

export type Action<S extends string, E extends string> = (eventDetail?: StateEventDetail<S, E>) => MaybePromise<void>;

export type ActionName<S extends string, E extends string> =
  | `on_${E}`
  | `on_state_exit`
  | `on_state_enter`
  | `on_${S}_exit`
  | `on_${S}_enter`
  | `on_${S}_${E}`
  | `on_all_${E}`;

export type ActionRecord<S extends string, E extends string> = Partial<Record<ActionName<S, E>, Action<S, E>>>;
