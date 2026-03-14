import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from './index.js';
import { settings } from './schema.js';

const USER_SETTINGS_TYPE = 'user_preference';

function getUserSettingsRows(userId) {
  const db = getDb();
  return db
    .select()
    .from(settings)
    .where(and(eq(settings.type, USER_SETTINGS_TYPE), eq(settings.createdBy, userId)))
    .all();
}

export function getUserSettingsMap(userId) {
  const rows = getUserSettingsRows(userId);
  const result = {};

  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }

  return result;
}

export function setUserSetting(userId, key, value) {
  const db = getDb();
  const now = Date.now();
  const encoded = JSON.stringify(value);
  const existing = db
    .select()
    .from(settings)
    .where(and(eq(settings.type, USER_SETTINGS_TYPE), eq(settings.createdBy, userId), eq(settings.key, key)))
    .get();

  if (existing) {
    db.update(settings)
      .set({ value: encoded, updatedAt: now })
      .where(eq(settings.id, existing.id))
      .run();
    return { ...existing, value: encoded, updatedAt: now };
  }

  const record = {
    id: randomUUID(),
    type: USER_SETTINGS_TYPE,
    key,
    value: encoded,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(settings).values(record).run();
  return record;
}

export function setUserSettings(userId, values) {
  const entries = Object.entries(values || {});
  for (const [key, value] of entries) {
    setUserSetting(userId, key, value);
  }
  return getUserSettingsMap(userId);
}
