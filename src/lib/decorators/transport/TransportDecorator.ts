import { Expose } from 'class-transformer';
import { IsEnum, ValidateIf, Matches } from 'class-validator';

import { MessageIdRegExp } from '../../agent/BaseMessage';

/**
 * Return route types.
 */
export enum ReturnRouteTypes {
  /** No messages should be returned over this connection. */
  none = 'none',
  /**  All messages for this key should be returned over this connection. */
  all = 'all',
  /** Send all messages matching this thread over this connection. */
  thread = 'thread',
}

/**
 * Represents `~transport` decorator
 * @see https://github.com/hyperledger/aries-rfcs/blob/master/features/0092-transport-return-route/README.md
 */
export class TransportDecorator {
  constructor(partial?: Partial<TransportDecorator>) {
    this.returnRoute = partial?.returnRoute;
    this.returnRouteThread = partial?.returnRouteThread;
  }

  @Expose({ name: 'return_route' })
  @IsEnum(ReturnRouteTypes)
  returnRoute?: ReturnRouteTypes;

  @Expose({ name: 'return_route_thread' })
  @ValidateIf((o: TransportDecorator) => o.returnRoute === ReturnRouteTypes.thread)
  @Matches(MessageIdRegExp)
  returnRouteThread?: string;
}
