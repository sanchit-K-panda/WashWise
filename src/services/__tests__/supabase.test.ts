import * as SecureStore from 'expo-secure-store';
import { supabase, ExpoSecureStoreAdapter } from '../supabase';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('Supabase Client and ExpoSecureStoreAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports a valid Supabase client instance with auth and from methods', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.rpc).toBe('function');
  });

  it('stores values in SecureStore using ExpoSecureStoreAdapter', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

    await ExpoSecureStoreAdapter.setItem('auth-key', 'session-token-value');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth-key', 'session-token-value');
  });

  it('retrieves values from SecureStore using ExpoSecureStoreAdapter', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored-token');

    const result = await ExpoSecureStoreAdapter.getItem('auth-key');
    expect(result).toBe('stored-token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth-key');
  });

  it('removes values from SecureStore using ExpoSecureStoreAdapter', async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

    await ExpoSecureStoreAdapter.removeItem('auth-key');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth-key');
  });

  it('handles SecureStore errors safely and returns null on failure', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Secure storage unavailable')
    );

    const result = await ExpoSecureStoreAdapter.getItem('invalid-key');
    expect(result).toBeNull();
  });
});
