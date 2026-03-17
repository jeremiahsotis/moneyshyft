import db from '../config/knex';
import { createConnectShyftNumberMappingServices } from '../../../../libs/platform/dist/connectshyftNumberMappings';

export type {
  ConnectShyftNumberMapping,
  NumberMappingCreateCommand,
  NumberMappingSaveResult,
  NumberMappingUpdateCommand,
} from '../../../../libs/platform/dist/connectshyftNumberMappings';

export const {
  connectShyftNumberMappingService,
  connectShyftNumberMappingServiceAsync,
} = createConnectShyftNumberMappingServices(db);
