import { kafka, TOPICS } from './kafkaClient';
import logger from '../utils/logger';

const log = logger.child({ module: 'kafka-admin' });

export async function createTopics(): Promise<void> {
    const admin = kafka.admin();
    try {
        await admin.connect();
        const topicList = Object.values(TOPICS).map(topic => ({
            topic,
            numPartitions: 1,
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
