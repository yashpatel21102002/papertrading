import { Kafka, logLevel as KafkaLogLevel } from 'kafkajs';
import logger from '../utils/logger';

const log = logger.child({ module: 'kafka' });

export const TOPICS = {
    ORDER_CREATED: 'order.created',
    ORDER_CANCEL_REQUESTED: 'order.cancel-requested',
    ORDER_EVENTS: 'order.events',
} as const;

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9094').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'api';

export const kafka = new Kafka({
    clientId,
    brokers,
    logCreator: () => ({ namespace, level: entryLevel, log: entry }) => {
        const { message } = entry;
        if (entryLevel === KafkaLogLevel.ERROR) {
            log.error({ namespace }, message);
        } else if (entryLevel === KafkaLogLevel.WARN) {
            log.warn({ namespace }, message);
        } else if (entryLevel === KafkaLogLevel.INFO) {
            log.info({ namespace }, message);
        } else {
            log.debug({ namespace }, message);
        }
    },
});
