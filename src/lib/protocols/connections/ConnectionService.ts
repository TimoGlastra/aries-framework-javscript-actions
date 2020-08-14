import uuid from 'uuid';
import { EventEmitter } from 'events';
import { OutboundMessage } from '../../types';
import { AgentConfig } from '../../agent/AgentConfig';
import { createOutboundMessage } from '../helpers';
import { ConnectionState } from './domain/ConnectionState';
import { DidDoc, Service, PublicKey, PublicKeyType, Authentication } from './domain/DidDoc';
import { ConnectionRecord } from '../../storage/ConnectionRecord';
import { Repository } from '../../storage/Repository';
import { Wallet } from '../../wallet/Wallet';
import { TrustPingMessage } from '../trustping/TrustPingMessage';
import { ConnectionInvitationMessage } from './ConnectionInvitationMessage';
import { ConnectionRequestMessage } from './ConnectionRequestMessage';
import { ConnectionResponseMessage } from './ConnectionResponseMessage';
import { signData, unpackAndVerifySignatureDecorator } from '../../decorators/signature/SignatureDecoratorUtils';
import { Connection } from './domain/Connection';
import { classToPlain, plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { AckMessage } from './AckMessage';
import { InboundMessageContext } from '../../agent/models/InboundMessageContext';

enum EventType {
  StateChanged = 'stateChanged',
}

class ConnectionService extends EventEmitter {
  wallet: Wallet;
  config: AgentConfig;
  connectionRepository: Repository<ConnectionRecord>;

  constructor(wallet: Wallet, config: AgentConfig, connectionRepository: Repository<ConnectionRecord>) {
    super();
    this.wallet = wallet;
    this.config = config;
    this.connectionRepository = connectionRepository;
  }

  async createConnectionWithInvitation(): Promise<{
    invitation: ConnectionInvitationMessage;
    connection: ConnectionRecord;
  }> {
    const connectionRecord = await this.createConnection();
    const invitationDetails = this.createInvitationDetails(this.config, connectionRecord);

    const invitation = new ConnectionInvitationMessage(invitationDetails);

    connectionRecord.invitation = invitationDetails;
    await this.updateState(connectionRecord, ConnectionState.INVITED);
    return { invitation, connection: connectionRecord };
  }

  async acceptInvitation(invitation: ConnectionInvitationMessage): Promise<OutboundMessage<ConnectionRequestMessage>> {
    const connectionRecord = await this.createConnection();

    const connectionRequest = new ConnectionRequestMessage({
      label: this.config.label,
      did: connectionRecord.did,
      didDoc: connectionRecord.didDoc,
    });

    await this.updateState(connectionRecord, ConnectionState.REQUESTED);

    return createOutboundMessage(connectionRecord, connectionRequest, invitation);
  }

  async acceptRequest(
    messageContext: InboundMessageContext<ConnectionRequestMessage>
  ): Promise<OutboundMessage<ConnectionResponseMessage>> {
    const { message, connection: connectionRecord, recipientVerkey } = messageContext;

    if (!connectionRecord) {
      throw new Error(`Connection for verkey ${recipientVerkey} not found!`);
    }

    // TODO: validate using class-validator
    if (!message.connection) {
      throw new Error('Invalid message');
    }

    connectionRecord.updateDidExchangeConnection(message.connection);

    if (!connectionRecord.theirKey) {
      throw new Error(`Connection with verkey ${connectionRecord.verkey} has no recipient keys.`);
    }

    connectionRecord.tags = { ...connectionRecord.tags, theirKey: connectionRecord.theirKey };

    const connection = new Connection({
      did: connectionRecord.did,
      didDoc: connectionRecord.didDoc,
    });

    // TODO: find a better way that directly calling classToPlain here
    const plainConnection = classToPlain(connection);

    const connectionResponse = new ConnectionResponseMessage({
      threadId: message.id,
      connectionSig: await signData(plainConnection, this.wallet, connectionRecord.verkey),
    });

    await this.updateState(connectionRecord, ConnectionState.RESPONDED);
    return createOutboundMessage(connectionRecord, connectionResponse);
  }

  async acceptResponse(messageContext: InboundMessageContext<ConnectionResponseMessage>) {
    const { message, connection: connectionRecord, recipientVerkey } = messageContext;

    if (!connectionRecord) {
      throw new Error(`Connection for verkey ${recipientVerkey} not found!`);
    }

    const connectionJson = await unpackAndVerifySignatureDecorator(message.connectionSig, this.wallet);
    const connection = plainToClass(Connection, connectionJson);
    await validateOrReject(connection);

    connectionRecord.updateDidExchangeConnection(connection);

    if (!connectionRecord.theirKey) {
      throw new Error(`Connection with verkey ${connectionRecord.verkey} has no recipient keys.`);
    }

    connectionRecord.tags = { ...connectionRecord.tags, theirKey: connectionRecord.theirKey };

    const response = new TrustPingMessage();
    await this.updateState(connectionRecord, ConnectionState.COMPLETE);
    return createOutboundMessage(connectionRecord, response);
  }

  async acceptAck(messageContext: InboundMessageContext<AckMessage>) {
    const connection = messageContext.connection;

    if (!connection) {
      throw new Error(`Connection for ${messageContext.recipientVerkey} not found!`);
    }

    if (connection.state !== ConnectionState.COMPLETE) {
      await this.updateState(connection, ConnectionState.COMPLETE);
    }
  }

  async updateState(connectionRecord: ConnectionRecord, newState: ConnectionState) {
    connectionRecord.state = newState;
    await this.connectionRepository.update(connectionRecord);
    const { verkey, state } = connectionRecord;
    this.emit(EventType.StateChanged, { verkey, newState: state });
  }

  private async createConnection(): Promise<ConnectionRecord> {
    const id = uuid();
    const [did, verkey] = await this.wallet.createDid({ method_name: 'sov' });
    const publicKey = new PublicKey(`${did}#1`, PublicKeyType.ED25519_SIG_2018, did, verkey);
    const service = new Service(
      `${did};indy`,
      this.config.getEndpoint(),
      [verkey],
      this.config.getRoutingKeys(),
      0,
      'IndyAgent'
    );
    const auth = new Authentication(publicKey);
    const didDoc = new DidDoc(did, [auth], [publicKey], [service]);

    const connectionRecord = new ConnectionRecord({
      id,
      did,
      didDoc,
      verkey,
      state: ConnectionState.INIT,
      tags: { verkey },
    });

    await this.connectionRepository.save(connectionRecord);
    return connectionRecord;
  }

  async getConnections() {
    return this.connectionRepository.findAll();
  }

  async find(connectionId: string): Promise<ConnectionRecord | null> {
    try {
      const connection = await this.connectionRepository.find(connectionId);

      return connection;
    } catch {
      // connection not found.
      return null;
    }
  }

  async findByVerkey(verkey: Verkey): Promise<ConnectionRecord | null> {
    const connectionRecords = await this.connectionRepository.findByQuery({ verkey });

    if (connectionRecords.length > 1) {
      throw new Error(`There is more than one connection for given verkey ${verkey}`);
    }

    if (connectionRecords.length < 1) {
      return null;
    }

    return connectionRecords.length > 0 ? connectionRecords[0] : null;
  }

  async findByTheirKey(verkey: Verkey): Promise<ConnectionRecord | null> {
    const connectionRecords = await this.connectionRepository.findByQuery({ theirKey: verkey });

    if (connectionRecords.length > 1) {
      throw new Error(`There is more than one connection for given verkey ${verkey}`);
    }

    if (connectionRecords.length < 1) {
      return null;
    }

    return connectionRecords[0];
  }

  private createInvitationDetails(config: AgentConfig, connection: ConnectionRecord) {
    const { didDoc } = connection;
    return {
      label: config.label,
      recipientKeys: didDoc.service[0].recipientKeys,
      serviceEndpoint: didDoc.service[0].serviceEndpoint,
      routingKeys: didDoc.service[0].routingKeys,
    };
  }
}

export { ConnectionService, EventType };
