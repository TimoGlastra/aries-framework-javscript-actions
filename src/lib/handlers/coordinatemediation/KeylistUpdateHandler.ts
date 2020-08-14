import { Handler, HandlerInboundMessage } from '../Handler';
import { ConnectionService } from '../../protocols/connections/ConnectionService';
import { ProviderRoutingService } from '../../protocols/routing/ProviderRoutingService';
import { KeylistUpdateMessage } from '../../protocols/coordinatemediation/KeylistUpdateMessage';

export class KeylistUpdateHandler implements Handler {
  connectionService: ConnectionService;
  routingService: ProviderRoutingService;
  supportedMessages = [KeylistUpdateMessage];

  constructor(connectionService: ConnectionService, routingService: ProviderRoutingService) {
    this.connectionService = connectionService;
    this.routingService = routingService;
  }

  async handle(messageContext: HandlerInboundMessage<KeylistUpdateHandler>) {
    if (!messageContext.connection) {
      throw new Error(`Connection for verkey ${messageContext.recipientVerkey} not found!`);
    }

    this.routingService.updateRoutes(messageContext, messageContext.connection);
  }
}
