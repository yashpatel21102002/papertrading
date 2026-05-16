import { Producer } from 'kafkajs';
import { kafka, TOPICS } from './kafkaClient';
import logger from '../utils/logger';

const log = logger.child({ module: 'kafka-producer' });

let producer: Producer | null = null;

export async function connectProducer(): Promise<void> {
    producer = kafka.producer();
    await producer.connect();
    log.info('Kafka producer connected');
}

export async function disconnectProducer(): Promise<void> {
    if (producer) {
        await producer.disconnect();
        producer = null;
        log.info('Kafka producer disconnected');
    }
}

export interface OrderEvent {
    orderId: string;
    symbol: string;
    quantity: number;
    price: number;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    status: 'open' | 'filled' | 'cancelled';
    executionPrice?: number;
}

const PUBLISH_MAX_RETRIES = 3;
const PUBLISH_RETRY_DELAY_MS = 500;

export async function publishOrderEvent(event: OrderEvent): Promise<void> {
    if (!producer) {
        log.error({ orderId: event.orderId }, 'Cannot publish: Kafka producer not connected');
        return;
    }

    let lastErr: unknown;
    for (let attempt = 1; attempt <= PUBLISH_MAX_RETRIES; attempt++) {
        try {
            await producer.send({
                topic: TOPICS.ORDER_EVENTS,
                // Key by symbol — ensures per-symbol ordering across fill / cancel events.
                messages: [{ key: event.symbol, value: JSON.stringify(event) }],
            });
            log.debug({ orderId: event.orderId, status: event.status }, 'Order event published');
            return;
        } catch (err) {
            lastErr = err;
            log.warn({ err, orderId: event.orderId, attempt }, 'Kafka publish failed, retrying');
            await new Promise(r => setTimeout(r, PUBLISH_RETRY_DELAY_MS * attempt));
        }
    }

    // All retries exhausted — the event is lost. Log at fatal so this is immediately visible.
    log.fatal({ err: lastErr, event }, 'Kafka publish failed after all retries — order event lost, manual intervention required');
}
