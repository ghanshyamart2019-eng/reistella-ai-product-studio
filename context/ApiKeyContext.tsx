
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getCookie, setCookie } from '../services/cookieService';
import { encrypt, decrypt } from '../services/cryptoService';
import { verifyApiKey } from '../services/geminiService';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string) => Promise<void>;
  isApiKeyValid: boolean;
  isVerifying: boolean;
  clearApiKey: () => void;
}

export const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

const API_KEY_COOKIE = 'gemini_api_key';

export const ApiKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  useEffect(() => {
    const checkStoredKey = async () => {
      const encryptedKey = getCookie(API_KEY_COOKIE);
      if (encryptedKey) {
        try {
          const decryptedKey = decrypt(encryptedKey);
          const isValid = await verifyApiKey(decryptedKey);
          if (isValid) {
            setApiKeyState(decryptedKey);
            setIsApiKeyValid(true);
          } else {
            // Clear invalid key
            setCookie(API_KEY_COOKIE, '', -1);
          }
        } catch (error) {
          console.error("Failed to decrypt or validate key:", error);
          setCookie(API_KEY_COOKIE, '', -1);
        }
      }
      setIsVerifying(false);
    };
    checkStoredKey();
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    setIsVerifying(true);
    const isValid = await verifyApiKey(key);
    if (isValid) {
      const encryptedKey = encrypt(key);
      setCookie(API_KEY_COOKIE, encryptedKey, 30);
      setApiKeyState(key);
      setIsApiKeyValid(true);
    } else {
      setIsApiKeyValid(false);
      // Let the modal handle showing the error
      throw new Error("Invalid API Key");
    }
    setIsVerifying(false);
  }, []);

  const clearApiKey = useCallback(() => {
    setApiKeyState(null);
    setIsApiKeyValid(false);
    setCookie(API_KEY_COOKIE, '', -1);
  }, []);

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, isApiKeyValid, isVerifying, clearApiKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
};
