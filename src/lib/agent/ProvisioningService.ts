import { Repository } from '../storage/Repository';
import { ProvisioningRecord } from '../storage/ProvisioningRecord';
import logger from '../logger';

const UNIQUE_PROVISIONING_ID = 'UNIQUE_PROVISIONING_ID';

export class ProvisioningService {
  provisioningRepository: Repository<ProvisioningRecord>;

  constructor(provisioningRepository: Repository<ProvisioningRecord>) {
    this.provisioningRepository = provisioningRepository;
  }

  async find(): Promise<ProvisioningRecord | null> {
    try {
      const provisioningRecord = await this.provisioningRepository.find(UNIQUE_PROVISIONING_ID);
      return provisioningRecord;
    } catch (error) {
      if (error.name === 'IndyError' && error.message === '212') {
        // WalletItemNotFound
        logger.log('WalletItemNotFound');
        return null;
      } else {
        throw error;
      }
    }
  }

  async create({ agencyConnectionId, agencyPublicVerkey }: ProvisioningProps): Promise<ProvisioningRecord> {
    const provisioningRecord = new ProvisioningRecord({
      id: UNIQUE_PROVISIONING_ID,
      agencyConnectionId,
      agencyPublicVerkey,
    });
    await this.provisioningRepository.save(provisioningRecord);
    return provisioningRecord;
  }
}

interface ProvisioningProps {
  agencyConnectionId: string;
  agencyPublicVerkey: Verkey;
}
