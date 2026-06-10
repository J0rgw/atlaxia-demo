/**
 * useLocalStorage Hook
 * Generic hook for managing localStorage with React state
 * Eliminates duplicate favorites utilities across components
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { storageLogger } from '@/lib/logger';

type SetValue<T> = T | ((prev: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // Get stored value or use initial
  const readValue = useCallback((): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      storageLogger.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Persist to localStorage when value changes
  const setValue = useCallback(
    (value: SetValue<T>) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch (error) {
          storageLogger.warn(`Error setting localStorage key "${key}":`, error);
        }
        return next;
      });
    },
    [key]
  );

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      storageLogger.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch {
          // Ignore parse errors from external changes
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Specialized hook for managing favorites as a Set
 * Common pattern used across many components
 */
export function useFavorites(storageKey: string): {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => void;
} {
  const [favoritesArray, setFavoritesArray] = useLocalStorage<string[]>(storageKey, []);

  // Convert array to Set for efficient lookups
  const favorites = useMemo(() => new Set(favoritesArray), [favoritesArray]);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoritesArray((prev) => {
        const set = new Set(prev);
        if (set.has(id)) {
          set.delete(id);
        } else {
          set.add(id);
        }
        return [...set];
      });
    },
    [setFavoritesArray]
  );

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const addFavorite = useCallback(
    (id: string) => {
      setFavoritesArray((prev) => {
        const set = new Set(prev);
        set.add(id);
        return [...set];
      });
    },
    [setFavoritesArray]
  );

  const removeFavorite = useCallback(
    (id: string) => {
      setFavoritesArray((prev) => prev.filter((f) => f !== id));
    },
    [setFavoritesArray]
  );

  const clearFavorites = useCallback(() => {
    setFavoritesArray([]);
  }, [setFavoritesArray]);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
  };
}

export default useLocalStorage;
