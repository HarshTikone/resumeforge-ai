import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  init: async () => {
    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({ user: session?.user ?? null, loading: false });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, loading: false });
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
