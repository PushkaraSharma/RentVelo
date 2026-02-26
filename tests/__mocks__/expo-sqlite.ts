import Database from 'better-sqlite3';

// A mock Expo SQLite Database instance that wraps better-sqlite3
class MockExpoDatabase {
    db: Database.Database;

    constructor(name: string) {
        // We use an in-memory database for fast, isolated tests
        this.db = new Database(':memory:');
    }

    execSync(source: string) {
        this.db.exec(source);
    }

    runSync(source: string, args: any[] = []) {
        const stmt = this.db.prepare(source);
        const result = stmt.run(...args);
        return {
            lastInsertRowId: result.lastInsertRowid,
            changes: result.changes,
        };
    }

    getAllSync(source: string, args: any[] = []) {
        const stmt = this.db.prepare(source);
        return stmt.all(...args);
    }

    getFirstSync(source: string, args: any[] = []) {
        const stmt = this.db.prepare(source);
        return stmt.get(...args);
    }

    prepareSync(source: string) {
        const stmt = this.db.prepare(source);
        return {
            executeSync: (args: any) => {
                let params = args || [];
                let changes = 0;
                let lastInsertRowid = 0;
                let results: any[] = [];

                if (stmt.reader) {
                    results = stmt.all(...params);
                } else {
                    const info = stmt.run(...params);
                    changes = info.changes;
                    lastInsertRowid = info.lastInsertRowid as number;
                }

                return {
                    lastInsertRowId: lastInsertRowid,
                    changes: changes,
                    getFirstSync: () => results.length > 0 ? results[0] : null,
                    getAllSync: () => results,
                };
            },
            executeForRawResultSync: (args: any) => {
                let params = args || [];
                let changes = 0;
                let lastInsertRowid = 0;
                let results: any[] = [];

                if (stmt.reader) {
                    results = stmt.all(...params);
                } else {
                    const info = stmt.run(...params);
                    changes = info.changes;
                    lastInsertRowid = info.lastInsertRowid as number;
                }

                return {
                    lastInsertRowId: lastInsertRowid,
                    changes: changes,
                    getFirstSync: () => (results.length > 0 ? Object.values(results[0] as object) : null),
                    getAllSync: () => results.map(o => Object.values(o as object)),
                };
            }
        };
    }

    closeSync() {
        this.db.close();
    }
}

// Keep a singleton instance for tests so that setup and tests share the same DB
let instance: MockExpoDatabase | null = null;

export function openDatabaseSync(name: string) {
    if (!instance) {
        instance = new MockExpoDatabase(name);
    }
    return instance;
}

export function __resetDatabase() {
    if (instance) {
        instance.closeSync();
        instance = null;
    }
}
