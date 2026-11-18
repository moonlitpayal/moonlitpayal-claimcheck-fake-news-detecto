import fs from 'fs';
import path from 'path';
import type { CustomFact, HistoryEntry } from '../src/types.ts';

interface AppStoreState {
  facts: CustomFact[];
  history: HistoryEntry[];
}

const DEFAULT_FACTS: CustomFact[] = [
  {
    id: 'default-1',
    statement: 'Mumbai has a tropical coastal climate and does not get natural snow.',
  },
  {
    id: 'default-2',
    statement: 'COVID-19 vaccines do not contain microchips or alter human DNA.',
  },
];

const STORE_FILE_PATH = path.resolve(process.cwd(), 'server', 'app_store.json');

class PersistentDataStore {
  private state: AppStoreState;

  constructor() {
    this.state = this.loadInitial();
  }

  private loadInitial(): AppStoreState {
    try {
      if (fs.existsSync(STORE_FILE_PATH)) {
        const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<AppStoreState>;
        return {
          facts: Array.isArray(parsed.facts) ? parsed.facts : DEFAULT_FACTS,
          history: Array.isArray(parsed.history) ? parsed.history : [],
        };
      }
    } catch {
      // Fall back to default store
    }
    return { facts: [...DEFAULT_FACTS], history: [] };
  }

  private persist(): void {
    try {
      fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist app store:', err);
    }
  }

  getFacts(): CustomFact[] {
    return this.state.facts;
  }

  addFact(statement: string): CustomFact {
    const item: CustomFact = {
      id: `fact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      statement: statement.trim(),
    };
    this.state.facts = [item, ...this.state.facts].slice(0, 30);
    this.persist();
    return item;
  }

  removeFact(id: string): CustomFact[] {
    this.state.facts = this.state.facts.filter((f) => f.id !== id);
    this.persist();
    return this.state.facts;
  }

  getHistory(): HistoryEntry[] {
    return this.state.history;
  }

  addHistory(entry: HistoryEntry): HistoryEntry[] {
    this.state.history = [entry, ...this.state.history].slice(0, 12);
    this.persist();
    return this.state.history;
  }

  clearHistory(): void {
    this.state.history = [];
    this.persist();
  }
}

export const appStore = new PersistentDataStore();
