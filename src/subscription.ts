import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

const pattern = /(猛禽)|(フクロウ)|(ふくろう)|(オオタカ)|(オオワシ)|(トンビ)|(オジロワシ)|(チョウゲンボウ)|(チュウヒ)|(イヌワシ)|(ノスリ)|(ハヤブサ)|(ハクトウワシ)|(ミミズク)|(みみずく)|(梟)|(鴞)|(鴟)|(🦉)/

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    // for (const post of ops.posts.creates) {
    //   console.log(post.record.text)
    // }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        // Language filter for Japanese language
        const _langs: string[] = create.record.langs as string[];
        if (_langs !== null && _langs !== undefined) {
          if (_langs.length === 0 || !_langs.includes('ja')) {
            return false;
          }
        } else {
          return false;
        }

        //image filter
        const _embed = create.record.embed;
        if (_embed !== null && _embed !== undefined) {
          const _type = _embed.$type as string;
          if (!_type.startsWith('app.bsky.embed.images')) {
            return false;
          }
        } else {
          return false;
        }

        // only owl and similar kinds related posts
        const _text = create.record.text.toLowerCase();
        return pattern.test(_text);
      })
      .map((create) => {
        // map owl-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
