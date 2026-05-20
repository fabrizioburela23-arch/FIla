import { ticketsRepository } from './tickets.repository';

export interface ETAResult {
  positionInQueue: number;
  etaSeconds: number;
  etaMinutes: number;
}

export async function calculateETA(serviceId: string, ticketId: string): Promise<ETAResult> {
  const [position, avgSecs] = await Promise.all([
    ticketsRepository.getQueuePosition(serviceId, ticketId),
    ticketsRepository.getAvgAttentionSecs(serviceId),
  ]);

  const etaSeconds = avgSecs * Math.max(position, 0);
  const etaMinutes = Math.ceil(etaSeconds / 60);

  return { positionInQueue: position, etaSeconds, etaMinutes };
}
