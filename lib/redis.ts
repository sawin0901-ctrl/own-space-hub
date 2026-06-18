import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

function getClient() {
  if (global.__redis) return global.__redis;
  const client = new Redis(process.env.REDIS_URL ?? "redis://redis:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  if (process.env.NODE_ENV !== "production") global.__redis = client;
  return client;
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop as keyof Redis];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
