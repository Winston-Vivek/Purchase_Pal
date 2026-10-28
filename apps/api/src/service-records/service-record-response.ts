import { ServiceRecord } from './service-record.entity';

export interface ServiceRecordResponse {
  id: string;
  purchaseId: string;
  serviceDate: string;
  description: string;
  provider: string | null;
  cost: number | null;
  notes: string | null;
}

export function toServiceRecordResponse(record: ServiceRecord): ServiceRecordResponse {
  return {
    id: record.id,
    purchaseId: record.purchaseId,
    serviceDate: record.serviceDate,
    description: record.description,
    provider: record.provider,
    // DECIMAL comes back from Postgres as a string to keep the paise exact.
    cost: record.cost === null ? null : Number(record.cost),
    notes: record.notes,
  };
}
