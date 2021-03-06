import { Equals, IsArray, ValidateNested, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

import { AgentMessage } from '../../agent/AgentMessage';
import { MessageType } from './messages';

export interface KeylistUpdateMessageOptions {
  id?: string;
  updates: KeylistUpdate[];
}

/**
 * Used to notify the mediator of keys in use by the recipient.
 *
 * @see https://github.com/hyperledger/aries-rfcs/blob/master/features/0211-route-coordination/README.md#keylist-update
 */
export class KeylistUpdateMessage extends AgentMessage {
  constructor(options: KeylistUpdateMessageOptions) {
    super();

    if (options) {
      this.id = options.id || this.generateId();
      this.updates = options.updates;
    }
  }

  @Equals(KeylistUpdateMessage.type)
  readonly type = KeylistUpdateMessage.type;
  static readonly type = MessageType.KeylistUpdate;

  @Type(() => KeylistUpdate)
  @IsArray()
  @ValidateNested()
  updates!: KeylistUpdate[];
}

export enum KeylistUpdateAction {
  add = 'add',
  remove = 'remove',
}

export class KeylistUpdate {
  constructor(options: { recipientKey: Verkey; action: KeylistUpdateAction }) {
    if (options) {
      this.recipientKey = options.recipientKey;
      this.action = options.action;
    }
  }

  @IsString()
  recipientKey!: Verkey;

  @IsEnum(KeylistUpdateAction)
  action!: KeylistUpdateAction;
}
