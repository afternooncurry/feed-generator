import { createDb, Database, migrateToLatest } from './db'
import { FirehoseSubscription } from './subscription'
import { JetstreamFirehoseSubscription } from './jetstream-subscription'
import { IndexerConfig } from './config'

export class Indexer {
  public db: Database
  public firehose: FirehoseSubscription
  public jetstream: JetstreamFirehoseSubscription
  public cfg: IndexerConfig

  constructor(
   db: Database,
    // firehose: FirehoseSubscription,
    jetstream: JetstreamFirehoseSubscription,
    cfg: IndexerConfig,
  ) {
    this.db = db
    // this.firehose = firehose
    this.jetstream = jetstream
    this.cfg = cfg
  }

  static create(cfg: IndexerConfig) {
    const db = createDb(cfg.sqliteLocation)
    // const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint)
    const firehose = null;
    const jetstream = new JetstreamFirehoseSubscription(cfg.jetstreamEndpoint ,cfg.jetstreamCollection , db)
    // const jetstream = null;
    const subscription = jetstream;

    return new Indexer(db, subscription, cfg)
  }

  // async start(): Promise<FirehoseSubscription> {
  async start(): Promise<JetstreamFirehoseSubscription> {
      await migrateToLatest(this.db)
    // this.firehose.run(this.cfg.subscriptionReconnectDelay)
    this.jetstream.run(this.cfg.subscriptionReconnectDelay)
    return this.jetstream;
  }
}

export default Indexer
