import {ComputedSignal} from './computed-signal.js';
import {EventSignal} from './event-signal.js';
import {StateSignal} from './state-signal.js';
import type {IReadonlySignal, SubscribeResult} from './type.js';

/**
 * A simple debounce function.
 * @param {(...args: any[]) => void} func The function to debounce.
 * @param {number} wait The debounce delay in milliseconds.
 * @returns {(...args: any[]) => void} A debounced function.
 * @private
 */
function debounce(func: (...args: any[]) => void, wait: number): (...args: any[]) => void {
  let timeout: NodeJS.Timeout | null;
  return function(...args: any[]): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
}


/**
 * Creates a new signal that debounces notifications from a source signal.
 *
 * @template T The type of the signal's value.
 *
 * @param {StateSignal<T>} sourceSignal The source signal to debounce.
 * @param {number} debounceTimeMs The debounce time in milliseconds.
 *
 * @returns {IReadonlySignal<T>} A new read-only signal that emits debounced values.
 *
 * @example
 * const source = new StateSignal({initialValue: ''});
 * const debounced = debounceSignal(source, 300);
 *
 * debounced.subscribe(value => console.log(`Debounced value: ${value}`));
 *
 * source.set('a');
 * source.set('ab');
 * source.set('abc');
 * // After 300ms of no new values, 'abc' will be logged.
 */
export function debounceSignal<T>(sourceSignal: StateSignal<T>, debounceTimeMs: number): IReadonlySignal<T> {
  const internalSignal = new StateSignal<T>({
    signalId: `${sourceSignal.signalId}-debounced-internal`,
    initialValue: sourceSignal.value,
  });

  const debouncedSet = debounce((value: T) => internalSignal.set(value), debounceTimeMs);

  sourceSignal.subscribe((newValue) => {
    debouncedSet(newValue);
  });

  return new ComputedSignal<T>({
    signalId: `${sourceSignal.signalId}-debounced`,
    deps: [internalSignal],
    get: () => internalSignal.value,
  });
}

/**
 * Creates a new computed signal that transforms the value of a source signal.
 *
 * @template T The type of the source signal's value.
 * @template R The type of the new signal's value.
 *
 * @param {string} signalId The ID for the new mapped signal.
 * @param {IReadonlySignal<T>} sourceSignal The source signal.
 * @param {(value: T) => R} project The projection function to apply to the source signal's value.
 *
 * @returns {IReadonlySignal<R>} A new read-only signal with the transformed value.
 *
 * @example
 * const user = new StateSignal({initialValue: {id: 1, name: 'John'}});
 * const userName = mapSignal('user-name', user, (u) => u.name);
 *
 * console.log(userName.value); // 'John'
 */
export function mapSignal<T, R>(
    signalId: string,
    sourceSignal: IReadonlySignal<T>,
    project: (value: T) => R,
): IReadonlySignal<R> {
  return new ComputedSignal<R>({
    signalId,
    deps: [sourceSignal],
    get: () => project(sourceSignal.value),
  });
}

/**
 * Creates a new signal that filters notifications from a source signal based on a predicate.
 *
 * @template T The type of the signal's value.
 *
 * @param {StateSignal<T>} sourceSignal The source signal to filter.
 * @param {(value: T) => boolean} predicate The function to test each value.
 *
 * @returns {StateSignal<T | undefined>} A new signal that only emits values that pass the predicate.
 *
 * @example
 * const numbers = new StateSignal({initialValue: 0});
 * const evenNumbers = filterSignal(numbers, num => num % 2 === 0);
 *
 * evenNumbers.subscribe(num => {
 *   if (num !== undefined) console.log(`Even number: ${num}`);
 * });
 *
 * numbers.set(1); // Nothing happens
 * numbers.set(2); // Logs "Even number: 2"
 */
export function filterSignal<T>(
    sourceSignal: StateSignal<T>,
    predicate: (value: T) => boolean,
): StateSignal<T | undefined> {
  const initialValue = predicate(sourceSignal.value) ? sourceSignal.value : undefined;
  const filteredSignal = new StateSignal<T | undefined>({
    signalId: `${sourceSignal.signalId}-filtered`,
    initialValue,
  });

  sourceSignal.subscribe((newValue) => {
    if (predicate(newValue)) {
      filteredSignal.set(newValue);
    }
  });

  return filteredSignal;
}

/**
 * Merges multiple event signals into a single event signal.
 *
 * @template T The type of the event payload.
 *
 * @param {string} signalId The ID for the new merged signal.
 * @param {EventSignal<T>[]} signals An array of event signals to merge.
 *
 * @returns {EventSignal<T>} A new event signal that fires when any of the source signals fire.
 *
 * @example
 * const clickSignal = new EventSignal<{x: number, y: number}>({signalId: 'click'});
 * const keySignal = new EventSignal<{key: string}>({signalId: 'key'});
 * const merged = mergeSignals('user-action', [clickSignal, keySignal]);
 *
 * merged.subscribe(payload => console.log('User action:', payload));
 *
 * clickSignal.dispatch({x: 10, y: 20}); // Logs "User action: {x: 10, y: 20}"
 */
export function mergeSignals<T>(signalId: string, signals: EventSignal<T>[]): EventSignal<T> {
  const mergedSignal = new EventSignal<T>({signalId});
  const subscriptions: SubscribeResult[] = [];

  for (const signal of signals) {
    const sub = signal.subscribe((value) => {
      mergedSignal.dispatch(value);
    });
    subscriptions.push(sub);
  }

  // Enhance the destroy method to unsubscribe from all source signals
  const originalDestroy = mergedSignal.destroy;
  mergedSignal.destroy = () => {
    for (const sub of subscriptions) {
      sub.unsubscribe();
    }
    originalDestroy.call(mergedSignal);
  };

  return mergedSignal;
}
