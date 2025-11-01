
// This key is for demonstration purposes. In a real-world application,
// this should be managed more securely and not hardcoded.
const SECRET_KEY = 'super-secret-key-for-ai-mockup-app';

declare const CryptoJS: any;

export const encrypt = (text: string): string => {
  if (typeof CryptoJS === 'undefined') {
    console.error('CryptoJS not loaded');
    return text;
  }
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decrypt = (ciphertext: string): string => {
  if (typeof CryptoJS === 'undefined') {
    console.error('CryptoJS not loaded');
    return ciphertext;
  }
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
