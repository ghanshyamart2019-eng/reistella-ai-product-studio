
import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

const getBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await getBase64(file);
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

export const verifyApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: "hello" }] }],
    });
    return true;
  } catch (error) {
    console.error("API key verification failed:", error);
    return false;
  }
};


export const describeImage = async (apiKey: string, imageFile: File): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const imagePart = await fileToGenerativePart(imageFile);
    const result: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [
            { text: "Describe the main product in this image for an e-commerce mockup. Be concise and focus on the object's key visual attributes. Example: 'a black wireless headset'." },
            imagePart
        ]}],
    });
    return result.text.trim();
};

export const generateMockupPrompts = async (apiKey: string, description: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Based on the product description "${description}", generate 3 distinct, creative, and photorealistic mockup scene prompts for an e-commerce platform. Each prompt should be a single, concise sentence. Focus on different settings like lifestyle, studio, and abstract. Return ONLY the prompts as a valid JSON array of strings.`;
    
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                      description: 'A single mockup prompt.'
                    },
                },
            },
        });

        const jsonStr = result.text.trim();
        const prompts = JSON.parse(jsonStr);
        if (Array.isArray(prompts) && prompts.length > 0 && prompts.every(p => typeof p === 'string')) {
            return prompts.slice(0, 3); // Ensure only 3 prompts are returned
        }
    } catch (error) {
        console.error("Failed to generate mockup prompts via AI, using fallback.", error);
    }
    
    // Fallback prompts if generation fails or returns invalid data
    return [
        `Photorealistic mockup of ${description}, presented in a modern, minimalist studio setting with soft, diffused lighting.`,
        `Photorealistic mockup of ${description}, displayed in a lifestyle scene relevant to the product.`,
        `A creative shot of ${description} on a vibrant, single-color background with dramatic shadows.`
    ];
};


export const generateImageFromImage = async (apiKey: string, imageFile: File, prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const imagePart = await fileToGenerativePart(imageFile);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE] },
    });
    
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("No image generated from image-to-image model.");
};