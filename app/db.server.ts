import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/walter-stock-assistant";
const DEFAULT_DB = "walter-stock-assistant";

declare global {
  // eslint-disable-next-line no-var
  var mongoSessionStorage: MongoDBSessionStorage | undefined;
}

function createMongoSessionStorage() {
  const raw = process.env.MONGODB_URI || DEFAULT_URI;
  const url = new URL(raw);
  const fromPath = url.pathname.replace(/^\//, "").split("/")[0];
  const dbName = process.env.MONGODB_DB || fromPath || DEFAULT_DB;

  return new MongoDBSessionStorage(url, dbName);
}

if (process.env.NODE_ENV !== "production") {
  if (!global.mongoSessionStorage) {
    global.mongoSessionStorage = createMongoSessionStorage();
  }
}

const sessionStorage =
  global.mongoSessionStorage ?? createMongoSessionStorage();

export async function deleteSessionsForShop(shop: string) {
  const sessions = await sessionStorage.findSessionsByShop(shop);
  if (sessions.length === 0) return;
  await sessionStorage.deleteSessions(sessions.map((session) => session.id));
}

export default sessionStorage;
