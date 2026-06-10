// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { memoryStorage } = vi.hoisted(() => {
  let store: Record<string, string> = {};
  const memoryStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
  vi.stubGlobal('localStorage', memoryStorage);
  return { memoryStorage };
});

import { useUserViewPrefsStore } from './userViewPrefsStore';

describe('userViewPrefsStore', () => {
  beforeEach(() => {
    memoryStorage.clear();
    useUserViewPrefsStore.getState().reset();
  });

  describe('togglePage', () => {
    it('adds a page to hiddenPages on first toggle', () => {
      useUserViewPrefsStore.getState().togglePage('variables');
      expect(useUserViewPrefsStore.getState().hiddenPages).toEqual(['variables']);
    });

    it('removes the page on second toggle', () => {
      const { togglePage } = useUserViewPrefsStore.getState();
      togglePage('variables');
      togglePage('variables');
      expect(useUserViewPrefsStore.getState().hiddenPages).toEqual([]);
    });

    it('keeps independent toggles for separate pages', () => {
      const { togglePage } = useUserViewPrefsStore.getState();
      togglePage('variables');
      togglePage('alerts');
      expect(useUserViewPrefsStore.getState().hiddenPages).toEqual(['variables', 'alerts']);
    });
  });

  describe('toggleSensor', () => {
    it('adds a sensor key on first toggle and removes on second', () => {
      const { toggleSensor } = useUserViewPrefsStore.getState();
      toggleSensor('FIT-101');
      expect(useUserViewPrefsStore.getState().hiddenSensors).toEqual(['FIT-101']);
      toggleSensor('FIT-101');
      expect(useUserViewPrefsStore.getState().hiddenSensors).toEqual([]);
    });
  });

  describe('isPageHidden / isSensorHidden', () => {
    it('reflects current hidden state', () => {
      const store = useUserViewPrefsStore.getState();
      expect(store.isPageHidden('variables')).toBe(false);
      store.togglePage('variables');
      expect(useUserViewPrefsStore.getState().isPageHidden('variables')).toBe(true);

      expect(store.isSensorHidden('FIT-101')).toBe(false);
      store.toggleSensor('FIT-101');
      expect(useUserViewPrefsStore.getState().isSensorHidden('FIT-101')).toBe(true);
    });
  });

  describe('persistence', () => {
    it('writes hidden lists to localStorage under the expected key', () => {
      useUserViewPrefsStore.getState().togglePage('alerts');
      useUserViewPrefsStore.getState().toggleSensor('LIT-101');

      const raw = localStorage.getItem('atlaxia-view-prefs');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.hiddenPages).toContain('alerts');
      expect(parsed.state.hiddenSensors).toContain('LIT-101');
    });
  });

  describe('reset', () => {
    it('clears both hidden lists', () => {
      const { togglePage, toggleSensor, reset } = useUserViewPrefsStore.getState();
      togglePage('variables');
      toggleSensor('FIT-101');
      reset();
      const state = useUserViewPrefsStore.getState();
      expect(state.hiddenPages).toEqual([]);
      expect(state.hiddenSensors).toEqual([]);
    });
  });
});
