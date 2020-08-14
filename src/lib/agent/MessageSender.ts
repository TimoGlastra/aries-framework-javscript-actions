import { OutboundMessage, OutboundPackage } from '../types';
import { OutboundTransporter } from '../transport/OutboundTransporter';
import { EnvelopeService } from './EnvelopeService';
import { ReturnRouteTypes } from '../decorators/transport/TransportDecorator';
import { MessageTransformer } from './MessageTransformer';
import { AgentMessage } from './AgentMessage';
import { Constructor } from '../utils/mixins';
import { InboundMessageContext } from './models/InboundMessageContext';

class MessageSender {
  envelopeService: EnvelopeService;
  outboundTransporter: OutboundTransporter;

  constructor(envelopeService: EnvelopeService, outboundTransporter: OutboundTransporter) {
    this.envelopeService = envelopeService;
    this.outboundTransporter = outboundTransporter;
  }

  async packMessage(outboundMessage: OutboundMessage): Promise<OutboundPackage> {
    return this.envelopeService.packMessage(outboundMessage);
  }

  async sendMessage(outboundMessage: OutboundMessage): Promise<void> {
    const outboundPackage = await this.envelopeService.packMessage(outboundMessage);
    await this.outboundTransporter.sendMessage(outboundPackage, false);
  }

  async sendAndReceiveMessage<T extends AgentMessage>(
    outboundMessage: OutboundMessage,
    ReceivedMessageClass: Constructor<T>
  ): Promise<InboundMessageContext<T>> {
    outboundMessage.payload.setReturnRouting(ReturnRouteTypes.all);

    const outboundPackage = await this.envelopeService.packMessage(outboundMessage);
    const inboundPackedMessage = await this.outboundTransporter.sendMessage(outboundPackage, true);
    const inboundUnpackedMessage = await this.envelopeService.unpackMessage(inboundPackedMessage);

    const message = MessageTransformer.toMessageInstance(inboundUnpackedMessage.message, ReceivedMessageClass);

    const messageContext = new InboundMessageContext(message, {
      connection: outboundMessage.connection,
      recipientVerkey: inboundUnpackedMessage.recipient_verkey,
      senderVerkey: inboundUnpackedMessage.sender_verkey,
    });

    return messageContext;
  }
}

export { MessageSender };
