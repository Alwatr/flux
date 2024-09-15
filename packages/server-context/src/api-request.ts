import {NODE_MODE} from '@alwatr/logger';
import {getClientId} from '@alwatr/util';

import {AlwatrServerRequestBase} from './server-request.js';

import type {ServerRequestState} from './server-request.js';
import type {FetchOptions} from '@alwatr/fetch/type.js';
import type {AlwatrServiceResponse} from '@alwatr/type';

export abstract class AlwatrApiRequestBase<
  T extends AlwatrServiceResponse = AlwatrServiceResponse,
  ExtraState extends string = never,
  ExtraEvent extends string = never,
> extends AlwatrServerRequestBase<ExtraState, ExtraEvent> {
  protected _responseJson?: T;

  protected override async fetch__(options: FetchOptions): Promise<void> {
    if (!NODE_MODE) {
      options.headers ??= {};
      if (!options.headers['client-id']) {
        options.headers['client-id'] = getClientId();
      }
    }

    await super.fetch__(options);

    let responseText: string;
    try {
      responseText = await this.response_!.text();
    }
    catch (err) {
      this._logger.error('_$fetch', 'invalid_response_text', err);
      throw err;
    }

    try {
      this._responseJson = JSON.parse(responseText);
    }
    catch (err) {
      this._logger.error('_$fetch', 'invalid_response_json', err, {responseText});
      throw err;
    }

    const responseJson = this._responseJson!;
    if (responseJson.ok !== true) {
      if (typeof responseJson.errorCode === 'string') {
        this._logger.accident('_$fetch', responseJson.errorCode, {responseJson});
        throw new Error(responseJson.errorCode);
      }
      else {
        this._logger.error('_$fetch', 'fetch_nok', 'fetch response json not ok', {responseJson});
        throw new Error('fetch_nok');
      }
    }
  }

  protected override resetToInitialState_(): void {
    super.resetToInitialState_();
    delete this._responseJson;
  }
}

export class AlwatrApiRequest<T extends AlwatrServiceResponse = AlwatrServiceResponse> extends AlwatrApiRequestBase<T> {
  /**
   * Current state.
   */
  get state(): ServerRequestState {
    return this._state;
  }

  get response(): T | undefined {
    return this._responseJson;
  }

  get _fetchResponse(): Response | undefined {
    return this.response_;
  }

  request(options?: Partial<FetchOptions>): void {
    return this.request_(options);
  }

  cleanup(): void {
    this.resetToInitialState_();
  }
}
