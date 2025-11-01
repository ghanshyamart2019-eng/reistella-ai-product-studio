
import React, { useState, useContext } from 'react';
import { ApiKeyContext } from '../context/ApiKeyContext';

const ApiKeyModal: React.FC = () => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const context = useContext(ApiKeyContext);

  if (!context) {
    throw new Error('ApiKeyModal must be used within an ApiKeyProvider');
  }

  const { setApiKey } = context;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!keyInput.trim()) {
      setError('API Key cannot be empty.');
      return;
    }
    setIsLoading(true);
    try {
      await setApiKey(keyInput.trim());
      // On success, the parent component will re-render and this modal will disappear.
    } catch (err) {
      setError('The API Key is invalid or there was a network issue. Please check your key and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-8 m-4 max-w-md w-full transform transition-all duration-300 scale-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Enter Your Gemini API Key</h2>
        <p className="text-gray-600 mb-6 text-sm">To use this tool, you need to provide your own Google AI Studio API key. Your key is stored securely in your browser and never sent to our servers.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 sr-only">Gemini API Key</label>
            <input
              id="apiKey"
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter your Gemini API Key here..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-500">
              Get an API Key
            </a>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? 'Verifying...' : 'Unlock Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;
