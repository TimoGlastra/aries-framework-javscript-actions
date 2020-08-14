import { OutboundMessage } from '../../types';
import { createOutboundMessage } from '../helpers';
import { ConnectionRecord } from '../../storage/ConnectionRecord';
import { KeylistUpdateMessage, KeylistUpdateAction } from '../coordinatemediation/KeylistUpdateMessage';
import { ForwardMessage } from './ForwardMessage';
import { InboundMessageContext } from '../../agent/models/InboundMessageContext';

class ProviderRoutingService {
  routingTable: { [recipientKey: string]: ConnectionRecord | undefined } = {};

  /**
   * @todo use connection from message context
   */
  updateRoutes(messageContext: InboundMessageContext<KeylistUpdateMessage>, connection: ConnectionRecord) {
    const { message } = messageContext;

    for (const update of message.updates) {
      switch (update.action) {
        case KeylistUpdateAction.add:
          this.saveRoute(update.recipientKey, connection);
          break;
        case KeylistUpdateAction.remove:
          this.removeRoute(update.recipientKey, connection);
          break;
      }
    }
  }

  forward(messageContext: InboundMessageContext<ForwardMessage>): OutboundMessage<ForwardMessage> {
    const { message, recipientVerkey } = messageContext;

    // TODO: update to class-validator validation
    if (!message.to) {
      throw new Error('Invalid Message: Missing required attribute "to"');
    }

    const connection = this.findRecipient(message.to);

    if (!connection) {
      throw new Error(`Connection for verkey ${recipientVerkey} not found!`);
    }

    if (!connection.theirKey) {
      throw new Error(`Connection with verkey ${connection.verkey} has no recipient keys.`);
    }

    return createOutboundMessage(connection, message);
  }

  getRoutes() {
    return this.routingTable;
  }

  findRecipient(recipientKey: Verkey) {
    const connection = this.routingTable[recipientKey];

    if (!connection) {
      throw new Error(`Routing entry for recipientKey ${recipientKey} does not exists.`);
    }

    return connection;
  }

  saveRoute(recipientKey: Verkey, connection: ConnectionRecord) {
    if (this.routingTable[recipientKey]) {
      throw new Error(`Routing entry for recipientKey ${recipientKey} already exists.`);
    }

    this.routingTable[recipientKey] = connection;
  }

  removeRoute(recipientKey: Verkey, connection: ConnectionRecord) {
    const storedConnection = this.routingTable[recipientKey];

    if (!storedConnection) {
      throw new Error('Cannot remove non-existing routing entry');
    }

    if (storedConnection.id !== connection.id) {
      throw new Error('Cannot remove routing entry for another connection');
    }

    delete this.routingTable[recipientKey];
  }
}

export { ProviderRoutingService };
