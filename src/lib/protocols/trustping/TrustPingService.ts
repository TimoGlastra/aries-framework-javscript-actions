import { createOutboundMessage } from '../helpers';
import { ConnectionRecord } from '../../storage/ConnectionRecord';
import { TrustPingMessage } from './TrustPingMessage';
import { TrustPingResponseMessage } from './TrustPingResponseMessage';
import { InboundMessageContext } from '../../agent/models/InboundMessageContext';

/**
 * @todo use connection from message context
 */
export class TrustPingService {
  processPing({ message }: InboundMessageContext<TrustPingMessage>, connection: ConnectionRecord) {
    if (message.responseRequested) {
      const response = new TrustPingResponseMessage({
        threadId: message.id,
      });

      return createOutboundMessage(connection, response);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  processPingResponse(messageContext: InboundMessageContext<TrustPingResponseMessage>) {}
}
