import * as SecureStore from 'expo-secure-store';

// Matches @clerk/clerk-expo TokenCache interface
export const tokenCache = {
  getToken: (key: string): Promise<string | null> =>
    SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(key, value),
  clearToken: (key: string): Promise<void> =>
    SecureStore.deleteItemAsync(key),
};
