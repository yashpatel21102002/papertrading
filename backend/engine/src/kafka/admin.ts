import { kafka, TOPICS } from './kafkaClient';
import logger from '../utils/logger';

const log = logger.child({ module: 'kafka-admin' });

export async function createTopics(): Promise<void> {
    const admin = kafka.admin();
    try {
        await admin.connect();
        // 10 partitions per topic allows up to 10 parallel consumer instances.
        // Producers key by symbol so all events for the same symbol go to the same
        // partition — this guarantees per-symbol ordering across create / cancel / fill.
        const numPartitions = process.env.KAFKA_PARTITIONS ? parseInt(process.env.KAFKA_PARTITIONS) : 10;
        const topicList = Object.values(TOPICS).map(topic => ({
            topic,
            numPartitions,
            replicationFactor: 1,
        }));
        const created = await admin.createTopics({ topics: topicList, waitForLeaders: true });
        if (created) {
            log.info({ topics: Object.values(TOPICS) }, 'Kafka topics created');
        } else {
            log.info({ topics: Object.values(TOPICS) }, 'Kafka topics already exist');
        }
    } catch (err) {
        log.error({ err }, 'Failed to create Kafka topics');
        throw err;
    } finally {
        await admin.disconnect();
    }
}
