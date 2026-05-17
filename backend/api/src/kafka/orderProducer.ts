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

export interface OrderCreatedPayload {
    orderId: string;
    symbol: string;
    quantity: number;
    price: number | null; // null for market orders
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
}

export async function produceOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    if (!producer) throw new Error('Kafka producer not connected');
    await producer.send({
        topic: TOPICS.ORDER_CREATED,
        // Key by symbol so the engine's consumer always routes same-symbol orders
        // to the same partition and processes them in order.
        messages: [{ key: payload.symbol, value: JSON.stringify(payload) }],
    });
    log.debug({ orderId: payload.orderId, symbol: payload.symbol, type: payload.type }, 'order.created produced');
}

export async function produceOrderCancelRequested(orderId: string): Promise<void> {
    if (!producer) throw new Error('Kafka producer not connected');
    await producer.send({
        topic: TOPICS.ORDER_CANCEL_REQUESTED,
        // Symbol not available here — orderId key still distributes load while keeping
        // individual order events ordered (only one cancel per orderId can exist).
        messages: [{ key: orderId, value: JSON.stringify({ orderId }) }],
    });
    log.debug({ orderId }, 'order.cancel-requested produced');
}
