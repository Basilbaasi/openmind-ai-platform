/**
 * IndexedDB Per-Session Message Storage.
 * 
 * Provides database isolation for each workspace session.
 * Each session gets its own DB instance: 'openmind_session_<session_id>'.
 */

import { Message } from "./types";

interface SessionMetadata {
  id: string;
  title: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  presencePenalty: number;
  jsonMode: boolean;
  createdAt: string;
}

/**
 * Open the database for a specific session.
 */
function openSessionDb(sessionId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Database name is unique per session
    const dbName = `openmind_session_${sessionId}`;
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB database: ${dbName}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store messages with auto-incrementing key or custom ID
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" });
      }

      // Store metadata/settings for the session
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };
  });
}

export const sessionDb = {
  /**
   * Save a list of messages to the session's isolated DB.
   */
  saveMessages: async (sessionId: string, messages: Message[]): Promise<void> => {
    try {
      const db = await openSessionDb(sessionId);
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["messages"], "readwrite");
        const store = transaction.objectStore("messages");

        // Clear existing messages in this transaction
        const clearRequest = store.clear();
        clearRequest.onerror = () => reject(clearRequest.error);

        clearRequest.onsuccess = () => {
          // Add all new messages
          let completed = 0;
          if (messages.length === 0) {
            resolve();
            return;
          }

          messages.forEach((msg) => {
            const addRequest = store.put(msg);
            addRequest.onerror = () => reject(addRequest.error);
            addRequest.onsuccess = () => {
              completed++;
              if (completed === messages.length) {
                resolve();
              }
            };
          });
        };
      });
    } catch (e) {
      console.error(`IndexedDB Error in saveMessages for session ${sessionId}:`, e);
    }
  },

  /**
   * Get all messages from the session's isolated DB.
   */
  getMessages: async (sessionId: string): Promise<Message[]> => {
    try {
      const db = await openSessionDb(sessionId);
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["messages"], "readonly");
        const store = transaction.objectStore("messages");
        const request = store.getAll();

        request.onerror = () => {
          reject(request.error);
        };

        request.onsuccess = () => {
          // Sort messages by timestamp or order if necessary.
          // By default, getAll returns them in order of keys added.
          resolve(request.result || []);
        };
      });
    } catch (e) {
      console.error(`IndexedDB Error in getMessages for session ${sessionId}:`, e);
      return [];
    }
  },

  /**
   * Save metadata parameters for a session.
   */
  saveMetadata: async (sessionId: string, metadata: Partial<SessionMetadata>): Promise<void> => {
    try {
      const db = await openSessionDb(sessionId);
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["metadata"], "readwrite");
        const store = transaction.objectStore("metadata");

        Object.entries(metadata).forEach(([key, value]) => {
          store.put({ key, value });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error(`IndexedDB Error in saveMetadata for session ${sessionId}:`, e);
    }
  },

  /**
   * Load metadata parameters for a session.
   */
  getMetadata: async (sessionId: string): Promise<Record<string, any>> => {
    try {
      const db = await openSessionDb(sessionId);
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["metadata"], "readonly");
        const store = transaction.objectStore("metadata");
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result: Record<string, any> = {};
          (request.result || []).forEach((item: { key: string; value: any }) => {
            result[item.key] = item.value;
          });
          resolve(result);
        };
      });
    } catch (e) {
      console.error(`IndexedDB Error in getMetadata for session ${sessionId}:`, e);
      return {};
    }
  },

  /**
   * Delete the entire IndexedDB database for a session.
   */
  deleteSessionDb: (sessionId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const dbName = `openmind_session_${sessionId}`;
      const request = indexedDB.deleteDatabase(dbName);

      request.onerror = () => {
        reject(new Error(`Failed to delete IndexedDB database: ${dbName}`));
      };

      request.onsuccess = () => {
        console.log(`Successfully deleted IndexedDB database: ${dbName}`);
        resolve();
      };
    });
  }
};
