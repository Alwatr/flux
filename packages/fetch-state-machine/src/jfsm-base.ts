import {AlwatrFetchStateMachineBase, type FetchOptions} from './base.js';

import type {Json} from '@alwatr/type-helper';

export abstract class AlwatrJsonFetchStateMachineBase<
  T extends Json = Json,
  ExtraState extends string = never,
  ExtraEvent extends string = never,
> extends AlwatrFetchStateMachineBase<ExtraState, ExtraEvent> {
  protected jsonResponse_?: T;

  protected override async fetch_(options: FetchOptions): Promise<void> {
    await super.fetch_(options);

    let responseText: string;
    try {
      responseText = await this.rawResponse_!.text();
    }
    catch (err) {
      this.logger_.error('fetch_', 'invalid_response_text', err);
      throw err;
    }

    try {
      // TODO: check 304 Not Modified
      this.jsonResponse_ = JSON.parse(responseText);
    }
    catch (err) {
      this.logger_.error('fetch_', 'invalid_response_json', err, {responseText});
      throw err;
    }
  }

  protected override resetToInitialState_(): void {
    super.resetToInitialState_();
    delete this.jsonResponse_;
  }
}
