import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { verifyAccessPassword } from '@/lib/accessGate';

// Tracks whether the visitor has cleared the demo password gate. Persisted in
// sessionStorage (not localStorage) so the gate re-locks when the tab/browser
// closes — a shared demo link should ask each new visitor for the password.
interface AccessGateState {
  unlocked: boolean;
  verifying: boolean;
  error: string | null;

  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  clearError: () => void;
}

export const useAccessGateStore = create<AccessGateState>()(
  persist(
    (set) => ({
      unlocked: false,
      verifying: false,
      error: null,

      unlock: async (password: string) => {
        set({ verifying: true, error: null });
        const ok = await verifyAccessPassword(password.trim()).catch(() => false);
        if (ok) {
          set({ unlocked: true, verifying: false, error: null });
        } else {
          set({ verifying: false, error: 'Contraseña incorrecta' });
        }
        return ok;
      },

      lock: () => set({ unlocked: false, error: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'atlaxia-gate',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ unlocked: state.unlocked }),
    },
  ),
);
