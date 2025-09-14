import {describe, it, expect, jest} from '@jest/globals';
import {delay} from '@alwatr/delay';

import {StateSignal, EventSignal, debounceSignal, filterSignal, mapSignal, mergeSignals} from '@alwatr/signal';

describe('Signal Factories', () => {
  describe('debounceSignal', () => {
    it('should emit the last value after the debounce duration', async () => {
      const source = new StateSignal({signalId: 'source', initialValue: 'initial'});
      const debounced = debounceSignal(source, 50);
      const callback = jest.fn();

      debounced.subscribe(callback);
      await delay.nextMacrotask();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('initial');

      source.set('a');
      source.set('ab');
      source.set('abc');
      await delay.by(20);
      expect(callback).toHaveBeenCalledTimes(1);

      await delay.by(50);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith('abc');

      source.destroy();
      debounced.destroy();
    });
  });

  describe('mapSignal', () => {
    it('should create a signal with the transformed value', async () => {
      const source = new StateSignal({signalId: 'user-source', initialValue: {name: 'John', age: 30}});
      const nameSignal = mapSignal('user-name', source, (user) => user.name);

      expect(nameSignal.value).toBe('John');

      const nextValuePromise = nameSignal.untilNext();
      source.set({name: 'Jane', age: 32});
      await nextValuePromise;
      expect(nameSignal.value).toBe('Jane');

      source.destroy();
      nameSignal.destroy();
    });
  });

  describe('filterSignal', () => {
    it('should only emit values that pass the predicate', async () => {
      const source = new StateSignal({signalId: 'number-source', initialValue: 0});
      const evenSignal = filterSignal(source, (n) => n % 2 === 0);
      const callback = jest.fn();

      evenSignal.subscribe(callback);
      await delay.nextMacrotask();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(0);

      source.set(1);
      await delay.nextMacrotask();
      expect(callback).toHaveBeenCalledTimes(1);

      source.set(2);
      await delay.nextMacrotask();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(2);

      source.destroy();
      evenSignal.destroy();
    });
  });

  describe('mergeSignals', () => {
    it('should merge multiple event signals into one', async () => {
      const clickSignal = new EventSignal({signalId: 'click'});
      const keySignal = new EventSignal({signalId: 'key'});
      const merged = mergeSignals('merged', [clickSignal, keySignal]);
      const callback = jest.fn();

      merged.subscribe(callback);

      clickSignal.dispatch({x: 100});
      await delay.nextMacrotask();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({x: 100});

      keySignal.dispatch({key: 'Enter'});
      await delay.nextMacrotask();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith({key: 'Enter'});

      merged.destroy();
    });
  });
});
