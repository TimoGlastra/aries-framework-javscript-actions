/* eslint-disable no-console */
import indy from 'indy-sdk';
import { IndyWallet } from '../../wallet/IndyWallet';
import { Wallet } from '../../wallet/Wallet';
import { Repository } from '../../storage/Repository';
import { StorageService } from '../../storage/StorageService';
import { IndyStorageService } from '../../storage/IndyStorageService';
import { BasicMessageService, EventType } from './BasicMessageService';
import { BasicMessageRecord } from '../../storage/BasicMessageRecord';
import { BasicMessage } from './BasicMessage';
import { InboundMessageContext } from '../../agent/models/InboundMessageContext';

describe('BasicMessageService', () => {
  const walletConfig = { id: 'test-wallet' + '-BasicMessageServiceTest' };
  const walletCredentials = { key: 'key' };
  const mockConnectionRecord = {
    id: 'd3849ac3-c981-455b-a1aa-a10bea6cead8',
    verkey: '71X9Y1aSPK11ariWUYQCYMjSewf2Kw2JFGeygEf9uZd9',
    did: 'did:sov:C2SsBf5QUQpqSAQfhu3sd2',
    didDoc: {},
    tags: {},
  };

  let wallet: Wallet;
  let storageService: StorageService<BasicMessageRecord>;

  beforeAll(async () => {
    wallet = new IndyWallet(walletConfig, walletCredentials, indy);
    await wallet.init();
    storageService = new IndyStorageService(wallet);
  });

  afterAll(async () => {
    await wallet.close();
    await wallet.delete();
  });

  describe('save', () => {
    let basicMessageRepository: Repository<BasicMessageRecord>;
    let basicMessageService: BasicMessageService;

    beforeEach(() => {
      basicMessageRepository = new Repository<BasicMessageRecord>(BasicMessageRecord, storageService);
      basicMessageService = new BasicMessageService(basicMessageRepository);
    });

    it(`emits newMessage with connection verkey and message itself`, async () => {
      const eventListenerMock = jest.fn();
      basicMessageService.on(EventType.MessageReceived, eventListenerMock);

      const basicMessage = new BasicMessage({
        id: '123',
        content: 'message',
      });

      const messageContext = new InboundMessageContext(basicMessage, {
        senderVerkey: 'senderKey',
        recipientVerkey: 'recipientKey',
      });

      // TODO
      // Currently, it's not so easy to create instance of ConnectionRecord object.
      // We use simple `mockConnectionRecord` as any type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await basicMessageService.save(messageContext, mockConnectionRecord as any);

      expect(eventListenerMock).toHaveBeenCalledWith({
        verkey: mockConnectionRecord.verkey,
        message: messageContext.message,
      });
    });
  });
});
