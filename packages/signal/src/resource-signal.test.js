import {describe, beforeEach, afterEach, it, expect, jest} from '@jest/globals';
import {delay} from '@alwatr/delay';

import {ResourceSignal} from '@alwatr/signal';

describe('ResourceSignal', () => {
  /** @type {jest.Mock<Promise<string>, [string]>} */
  let action;
  /** @type {import('@alwatr/signal').ResourceSignal<string, string, Error>} */
  let resourceSignal;

  beforeEach(() => {
    action = jest.fn(async (params) => {
      await delay.by(1); // Simulate async work
      if (params === 'fail') {
        throw new Error('Failed');
      }
      return `Success: ${params}`;
    });

    resourceSignal = new ResourceSignal({
      signalId: 'test-resource-signal',
      action,
    });
  });

  afterEach(() => {
    if (!resourceSignal.isDestroyed) {
      resourceSignal.destroy();
    }
  });

  it('should be in the "initial" state initially', () => {
    expect(resourceSignal.value).toEqual({state: 'initial'});
  });

  it('should transition through loading to success on trigger', async () => {
    const states = [];
    expect(resourceSignal.value).toEqual({state: 'initial'});

    resourceSignal.subscribe((state) => states.push(state), {receivePrevious: false});

    await resourceSignal.trigger('test');
    await delay.nextMacrotask();

    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('test');
    expect(states).toEqual([
      {state: 'loading'},
      {state: 'success', data: 'Success: test'},
    ]);
  });

  it('should transition through loading to error on trigger failure', async () => {
    const states = [];
    expect(resourceSignal.value).toEqual({state: 'initial'});
    resourceSignal.subscribe((state) => states.push(state), {receivePrevious: false});

    await resourceSignal.trigger('fail');
    await delay.nextMacrotask();

    expect(action).toHaveBeenCalledTimes(1);
    expect(states.length).toBe(2);
    expect(states[0]).toEqual({state: 'loading'});
    expect(states[1].state).toBe('error');
    expect(states[1].error?.message).toBe('Failed');
  });

  it('should not trigger a new action while already loading', async () => {
    const trigger1 = resourceSignal.trigger('first');
    expect(resourceSignal.value.state).toBe('loading');

    const trigger2 = resourceSignal.trigger('second'); // This call should be ignored

    await Promise.all([trigger1, trigger2]);

    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('first');
  });

  it('should retry the last action successfully', async () => {
    await resourceSignal.trigger('retry-test');
    expect(resourceSignal.value.state).toBe('success');

    action.mockClear();

    await resourceSignal.retry();
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('retry-test');
    expect(resourceSignal.value.state).toBe('success');
  });
});
