import { blank, seed, uid, validateData } from "./domain.js";

const DATABASE = "expeditionops-demo-v1";
const STORE = "expeditions";
const MAX_BYTES = 1_000_000;
let databasePromise;

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function parseBackup(text) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) {
    throw new Error("Backup must be under 1 MB");
  }
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON");
  }
  if (
    backup &&
    Object.hasOwn(backup, "format") &&
    backup.format !== "expeditionops-v1"
  ) {
    throw new Error("Unsupported backup format");
  }
  return validateData(backup?.data ?? backup);
}

export function encodeBackup(data) {
  return JSON.stringify(
    {
      format: "expeditionops-v1",
      exported: new Date().toISOString(),
      data: validateData(data),
    },
    null,
    2,
  );
}

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore(STORE, { keyPath: "id" });
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = undefined;
        };
        resolve(database);
      };
      request.onerror = () =>
        reject(
          new Error(
            "Browser storage is unavailable. Allow site storage and try again.",
          ),
        );
      request.onblocked = () =>
        reject(new Error("Close other ExpeditionOps tabs, then try again."));
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

async function transaction(mode, operate) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    let error;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () =>
      reject(
        error ??
          new Error(
            "Could not save in this browser. Export JSON before leaving, then try again.",
          ),
      );
    tx.onerror = () => {
      /* The abort handler reports the transaction failure. */
    };
    const done = (value) => {
      result = value;
    };
    const abort = (reason) => {
      error = reason;
      tx.abort();
    };
    try {
      operate(store, done, abort);
    } catch (reason) {
      abort(reason);
    }
  });
}

// Same data contract as the original workspace, implemented entirely on this device.
export async function localApi(path, method = "GET", body) {
  if (path === "/api/expeditions" && method === "GET") {
    return transaction("readonly", (store, done) => {
      const request = store.getAll();
      request.onsuccess = () =>
        done({
          expeditions: request.result
            .sort((a, b) => b.updated.localeCompare(a.updated))
            .map(({ id, name, revision, updated }) => ({
              id,
              name,
              revision,
              updated,
            })),
        });
    });
  }
  if (path === "/api/expeditions" && method === "POST") {
    const data = validateData(body?.data ?? (body?.demo ? seed() : blank()));
    const record = {
      id: uid(),
      name: data.name,
      data,
      revision: 1,
      updated: new Date().toISOString(),
    };
    return transaction("readwrite", (store, done) => {
      store.add(record);
      done(record);
    });
  }
  const match = path.match(/^\/api\/expeditions\/([a-f0-9-]+)$/);
  if (!match || !["GET", "PUT"].includes(method)) throw fail("Not found", 404);
  const next = method === "PUT" ? validateData(body?.data) : null;
  if (
    next &&
    new TextEncoder().encode(JSON.stringify(next)).length > MAX_BYTES
  ) {
    throw fail(
      "Expedition is too large. Export JSON to preserve your changes.",
      413,
    );
  }
  if (method === "PUT" && !Number.isInteger(body?.revision))
    throw fail("Revision required", 400);
  return transaction(
    method === "PUT" ? "readwrite" : "readonly",
    (store, done, abort) => {
      const request = store.get(match[1]);
      request.onsuccess = () => {
        const record = request.result;
        if (!record)
          return abort(fail("Expedition not found in this browser", 404));
        if (method === "GET") return done(record);
        if (record.revision !== body.revision) {
          return abort(
            fail(
              "Another tab updated this expedition. Export your changes, then reload the latest version.",
              409,
            ),
          );
        }
        const updated = {
          ...record,
          name: next.name,
          data: next,
          revision: record.revision + 1,
          updated: new Date().toISOString(),
        };
        store.put(updated);
        done({ revision: updated.revision });
      };
    },
  );
}
