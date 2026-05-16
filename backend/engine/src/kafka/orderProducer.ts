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

export async function publishOrderEvent(event: OrderEvent): Promise<void> {
    if (!producer) {
        log.error({ orderId: event.orderId }, 'Cannot publish: Kafka producer not connected');
        return;
    }
    await producer.send({
        topic: TOPICS.ORDER_EVENTS,
        messages: [{ key: event.orderId, value: JSON.stringify(event) }],
    });
    log.debug({ orderId: event.orderId, status: event.status }, 'Order event published');
}
