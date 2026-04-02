import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserSettings,
  updateUserSettings,
  addSavedProperty,
  removeSavedProperty,
  type UserProfile,
} from "@/api/user";

export const USER_KEYS = {
  all: ["user"] as const,
  profile: (uid: string | undefined) => [...USER_KEYS.all, "profile", uid] as const,
};

export function useUserProfile(uid: string | undefined) {
  return useQuery<UserProfile, Error>({
    queryKey: USER_KEYS.profile(uid),
    queryFn: fetchUserSettings,
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateUserSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      updateUserSettings(key, value),
    onSuccess: () => {
      // Typically we don't know the exact UID here easily if not passed,
      // but invalidating all 'profile' queries or passing UID works.
      // Easiest is to invalidate the generic profile key base.
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
}

export function useAddSavedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: number | string) => addSavedProperty(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
}

export function useRemoveSavedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: number | string) => removeSavedProperty(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
}
