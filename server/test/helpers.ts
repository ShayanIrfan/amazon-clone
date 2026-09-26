import mongoose from "mongoose";

/**
 * Empties every collection in the (guarded, `*-test`) database. Used instead
 * of dropDatabase(), which needs a higher Atlas role than the app's own
 * readWrite user; indexes are kept, so unique constraints still apply.
 */
export async function wipeDatabase() {
  const db = mongoose.connection.db!;
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (name.startsWith("system.")) continue;
    await db.collection(name).deleteMany({});
  }
}
