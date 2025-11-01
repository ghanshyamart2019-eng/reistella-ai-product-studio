
import React, { useState, useContext, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ApiKeyContext, ApiKeyProvider } from './context/ApiKeyContext';
import ApiKeyModal from './components/ApiKeyModal';
import Spinner from './components/common/Spinner';
import { GeneratedImage, LoadingState } from './types';
import { describeImage, generateImageFromImage, generateMockupPrompts } from './services/geminiService';

declare const JSZip: any;

const MainApp: React.FC = () => {
    const context = useContext(ApiKeyContext);
    if (!context) throw new Error("MainApp must be used within an ApiKeyProvider");

    const { apiKey, isApiKeyValid, isVerifying, clearApiKey } = context;

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [productDescription, setProductDescription] = useState<string>('');
    const [mockupPrompts, setMockupPrompts] = useState<string[]>([]);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [loadingState, setLoadingState] = useState<LoadingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);

    const resetState = () => {
        setImageFile(null);
        setProductDescription('');
        setMockupPrompts([]);
        setGeneratedImages([]);
        setLoadingState('idle');
        setError(null);
        setLightboxImage(null);
    };

    const processImage = async (file: File) => {
        if (!apiKey) {
            setError("API Key is not available.");
            return;
        }

        resetState();
        setImageFile(file);
        
        try {
            setLoadingState('describing');
            const description = await describeImage(apiKey, file);
            setProductDescription(description);

            const prompts = await generateMockupPrompts(apiKey, description);
            setMockupPrompts(prompts);
            
            setLoadingState('editing-prompts');

        } catch (err) {
            console.error("Image processing failed:", err);
            setError("An error occurred during image analysis. Please check your API key and try again.");
            setLoadingState('error');
        }
    };

    const handleGenerateMockups = async () => {
        if (!apiKey || !imageFile) {
            setError("An error occurred. Please start over.");
            setLoadingState('error');
            return;
        }
        
        try {
            setLoadingState('generating');
            const whiteBgPrompt = "Place the product on a clean, pure white background with a subtle, realistic shadow.";

            const promises = [
                generateImageFromImage(apiKey, imageFile, whiteBgPrompt),
                generateImageFromImage(apiKey, imageFile, mockupPrompts[0]),
                generateImageFromImage(apiKey, imageFile, mockupPrompts[1]),
                generateImageFromImage(apiKey, imageFile, mockupPrompts[2])
            ];

            const [whiteBg, mockup1, mockup2, mockup3] = await Promise.all(promises);

            setGeneratedImages([
                { id: 'white', src: `data:image/png;base64,${whiteBg}`, name: 'white_bg.png', label: 'White Background' },
                { id: 'mockup1', src: `data:image/png;base64,${mockup1}`, name: 'mockup_scene_1.png', label: 'AI Mockup Scene 1' },
                { id: 'mockup2', src: `data:image/png;base64,${mockup2}`, name: 'mockup_scene_2.png', label: 'AI Mockup Scene 2' },
                { id: 'mockup3', src: `data:image/png;base64,${mockup3}`, name: 'mockup_scene_3.png', label: 'AI Mockup Scene 3' },
            ]);

            setLoadingState('done');

        } catch (err) {
            console.error("Image generation failed:", err);
            setError("An error occurred during image generation. Please check your API key, ensure it has enough credits, and try again.");
            setLoadingState('error');
        }
    };
    
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError("Image size cannot exceed 10MB.");
                return;
            }
            processImage(file);
        }
    }, [apiKey]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/heic': ['.heic'] },
        multiple: false
    });

    const downloadImage = (src: string, name: string) => {
        const link = document.createElement('a');
        link.href = src;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAll = async () => {
        if (typeof JSZip === 'undefined') {
            console.error('JSZip not loaded');
            alert('Could not download all files. JSZip library is missing.');
            return;
        }
        const zip = new JSZip();
        for (const image of generatedImages) {
            const response = await fetch(image.src);
            const blob = await response.blob();
            zip.file(image.name, blob);
        }
        zip.generateAsync({ type: 'blob' }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'product_mockups.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };
    
    const handlePromptChange = (index: number, value: string) => {
        setMockupPrompts(prompts => prompts.map((p, i) => i === index ? value : p));
    };

    if (isVerifying) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner message="Verifying API Key..." />
            </div>
        );
    }

    if (!isApiKeyValid) {
        return <ApiKeyModal />;
    }

    const renderContent = () => {
        if (loadingState === 'idle' || loadingState === 'error') {
            return (
                <div {...getRootProps()} className={`relative border-4 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}>
                    <input {...getInputProps()} />
                    <svg className="mx-auto h-16 w-16 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-4 text-xl font-semibold text-gray-700">Drop your product photo here</p>
                    <p className="mt-1 text-sm text-gray-500">or click to upload (PNG, JPG, HEIC up to 10MB)</p>
                    {error && <p className="mt-4 text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
                </div>
            );
        }
        
        if (loadingState === 'editing-prompts' && imageFile) {
            return (
                 <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Your Product</h3>
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                               <img src={URL.createObjectURL(imageFile)} alt="Uploaded product" className="w-full h-full object-contain" />
                            </div>
                            <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                <span className="font-semibold text-gray-800">AI Description:</span>
                                <em className="ml-1">{productDescription}</em>
                            </p>
                        </div>
                        <div className="md:col-span-2">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Customize Your Mockup Scenes</h3>
                            <p className="text-gray-600 mb-4 text-sm">Fine-tune the AI-generated prompts below to create the perfect mockups for your product.</p>
                            <div className="space-y-4">
                                {mockupPrompts.map((prompt, index) => (
                                    <div key={index}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mockup Scene {index + 1}</label>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => handlePromptChange(index, e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                                <button onClick={handleGenerateMockups} className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition flex-grow">
                                    Generate Mockups
                                </button>
                                 <button onClick={resetState} className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition">
                                    Start Over
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        let spinnerMessage = '';
        if (loadingState === 'describing') spinnerMessage = 'Analyzing your product...';
        if (loadingState === 'generating') spinnerMessage = `Generating mockups for: ${productDescription}`;

        return <Spinner message={spinnerMessage} />;
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">AI Product Mockup Generator</h1>
                    <button onClick={clearApiKey} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Change API Key</button>
                </div>
            </header>
            <main className="py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {generatedImages.length === 0 && (
                        <div className="max-w-4xl mx-auto">
                            {renderContent()}
                        </div>
                    )}
                    
                    {generatedImages.length > 0 && loadingState === 'done' && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div>
                                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Your Mockups are Ready!</h2>
                                    <p className="mt-1 text-lg text-gray-600">Based on: <span className="font-semibold italic">{productDescription}</span></p>
                                </div>
                                <div className="flex gap-4 flex-shrink-0">
                                    <button onClick={resetState} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition">Start Over</button>
                                    <button onClick={downloadAll} className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        Download All (.zip)
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                {generatedImages.map((image) => (
                                    <div key={image.id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                                        <img src={image.src} alt={image.label} className="w-full h-auto object-cover aspect-square cursor-pointer" onClick={() => setLightboxImage(image)} />
                                        <div className="p-4 flex justify-between items-center gap-2">
                                            <h3 className="font-semibold text-gray-800 truncate pr-2">{image.label}</h3>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <button onClick={() => setLightboxImage(image)} className="text-gray-500 hover:text-indigo-600 transition-colors" title="Zoom">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                </button>
                                                <button onClick={() => downloadImage(image.src, image.name)} className="text-gray-500 hover:text-indigo-600 transition-colors" title="Download">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </main>
             {lightboxImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-4xl w-11/12 max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
                        <img 
                            src={lightboxImage.src} 
                            alt={lightboxImage.label} 
                            className="w-auto h-auto max-w-full max-h-[85vh] rounded-lg shadow-2xl mx-auto" 
                        />
                        <button 
                            onClick={() => setLightboxImage(null)} 
                            className="absolute -top-2 -right-2 h-10 w-10 bg-white rounded-full text-gray-800 text-2xl flex items-center justify-center shadow-lg hover:bg-gray-200 transition"
                            aria-label="Close lightbox"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const App: React.FC = () => {
    return (
        <ApiKeyProvider>
            <MainApp />
        </ApiKeyProvider>
    );
};

export default App;