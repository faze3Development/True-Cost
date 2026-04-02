import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAddSavedProperty, useRemoveSavedProperty, USER_KEYS } from "@/hooks/useUser";
import { useQueryClient } from "@tanstack/react-query";

const BOOKMARKS_STORAGE_KEY = "saved-assets:bookmarked";

export function useBookmarks() {
  const { dbUser, isAuthenticated, user } = useAuth();
  const [localBookmarks, setLocalBookmarks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const addSavedPropertyMutation = useAddSavedProperty();
  const removeSavedPropertyMutation = useRemoveSavedProperty();

  useEffect(() => {
    if (isAuthenticated && dbUser?.saved_properties) {
      const dbIds = dbUser.saved_properties.map((p) => String(p.property_id));
      setLocalBookmarks(new Set(dbIds));
      // Backup to local storage for quick load later
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(dbIds));
    } else if (!isAuthenticated) {
      try {
        const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLocalBookmarks(new Set(parsed.map(String)));
          }
        }
      } catch (e) {
        console.warn("Failed to read bookmarks context");
      }
    }
  }, [dbUser, isAuthenticated]);

  const toggleBookmark = useCallback(async (rawId: string | number) => {
    const id = String(rawId);
    // Determine the intended action before updating state
    const willAdd = !localBookmarks.has(id);

    // Optimistic UI update
    setLocalBookmarks((prev) => {
      const next = new Set(prev);
      if (willAdd) {
        next.add(id);
      } else {
        next.delete(id);
      }

      if (!isAuthenticated) {
        try {
          localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(next)));
        } catch (error) {
          console.warn("Failed to save bookmarks", error);
        }
      }
      return next;
    });

    if (isAuthenticated && user) {
      try {
        if (willAdd) {
          await addSavedPropertyMutation.mutateAsync(rawId);
        } else {
          await removeSavedPropertyMutation.mutateAsync(rawId);
        }
        // Invalidate to refetch actual state
        queryClient.invalidateQueries({ queryKey: USER_KEYS.profile(user.uid) });
      } catch (error) {
        console.error("Failed to sync bookmark to server", error);
        // We could revert the optimistic update here if needed.
        // Revert:
        setLocalBookmarks((prev) => {
          const next = new Set(prev);
          if (willAdd) {
             next.delete(id);
          } else {
             next.add(id);
          }
          return next;
        });
      }
    } else {
       // Only dispatch for local storage sync when not authenticated
       window.dispatchEvent(new Event("bookmarks-updated"));
    }
  }, [localBookmarks, isAuthenticated, user, queryClient, addSavedPropertyMutation, removeSavedPropertyMutation]);

  // Sync across tabs if unauthenticated
  useEffect(() => {
    if (isAuthenticated) return;
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
        if (saved) {
          setLocalBookmarks(new Set(JSON.parse(saved)));
        } else {
          setLocalBookmarks(new Set());
        }
      } catch (e) {}
    };
    window.addEventListener("bookmarks-updated", handleUpdate);
    // Also listen to storage events across tabs
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("bookmarks-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [isAuthenticated]);

  return { bookmarkedIds: localBookmarks, toggleBookmark };
}
