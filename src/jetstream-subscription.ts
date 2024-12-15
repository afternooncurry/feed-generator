import {
    getJetstreamOpsByType,
    isJetstreamCommit,
    JetstreamEvent,
    JetstreamFirehoseSubscriptionBase,
} from "./util/jetstream-subscription";

const pattern = /(猛禽)|(フクロウ)|(ふくろう)|(オオタカ)|(オオワシ)|(トンビ)|(オジロワシ)|(チョウゲンボウ)|(チュウヒ)|(イヌワシ)|(ノスリ)|(ハヤブサ)|(ハクトウワシ)|(ミミズク)|(みみずく)|(梟)|(鴞)|(鴟)|(🦉)/

export class JetstreamFirehoseSubscription extends JetstreamFirehoseSubscriptionBase {
    async handleEvent(evt: JetstreamEvent) {
        if (!isJetstreamCommit(evt)) return;

        const ops = getJetstreamOpsByType(evt);

        if (!ops || !ops.posts?.length) return;

        const postsToCreate = ops.posts
            .filter((create) => {
                // Language filter for Japanese language
                const _langs: string[] = create.commit.record.langs as string[];
                if (_langs !== null && _langs !== undefined) {
                    if (_langs.length === 0 || !_langs.includes('ja')) {
                        return false;
                    }
                } else {
                    return false;
                }

                //image filter
                const _embed = create.commit.record.embed;
                if (_embed !== null && _embed !== undefined) {
                    const _type = _embed.$type as string;
                    if (!_type.startsWith('app.bsky.embed.images')) {
                        return false;
                    }
                } else {
                    return false;
                }

                // only owl and similar kinds related posts
                const _text = create.commit.record.text.toLowerCase();
                return pattern.test(_text);
            })
            .map((create) => {
                // map owl-related posts to a db row
                const uri = `at://${evt.did}/${evt.commit.collection}/${evt.commit.rkey}`;

                return {
                    uri: uri,
                    cid: create.commit.cid,
                    replyParent: create.commit.record?.reply?.parent.uri ?? null,
                    replyRoot: create.commit.record?.reply?.root.uri ?? null,
                    indexedAt: new Date().toISOString(),
                }
            })

        if (postsToCreate.length > 0) {
            await this.db
                .insertInto('post')
                .values(postsToCreate)
                .onConflict((oc) => oc.doNothing())
                .execute()
        }
    }
}