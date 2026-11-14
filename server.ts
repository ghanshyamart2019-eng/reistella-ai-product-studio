import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI, Modality, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getErrorStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = Number((err as { status?: unknown }).status);
    if (Number.isInteger(status) && status >= 400 && status < 600) {
      return status;
    }
  }
  return 500;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.post('/api/gemini/describe', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || !mimeType) {
        res.status(400).json({ error: 'imageBase64 and mimeType are required.' });
        return;
      }

      const ai = getAiClient();
      const result = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            parts: [
              {
                text: "Describe the main product in this image for an e-commerce mockup. Be concise and focus on the object's key visual attributes. Example: 'a black wireless headset'.",
              },
              {
                inlineData: {
                  data: imageBase64,
                  mimeType,
                },
              },
            ],
          },
        ],
      });

      const description = (result.text ?? '').trim();
      if (!description) {
        res.status(502).json({ error: 'Failed to generate product description.' });
        return;
      }

      res.json({ description });
    } catch (err) {
      console.error('Error in /api/gemini/describe:', err);
      res.status(getErrorStatus(err)).json({
        error: getErrorMessage(err, 'An error occurred during image analysis.'),
      });
    }
  });

  app.post('/api/gemini/mockup-prompts', async (req: Request, res: Response) => {
    const { description } = req.body as { description?: string };

    if (!description || typeof description !== 'string') {
      res.status(400).json({ error: 'description is required.' });
      return;
    }

    const fallbackPrompts = [
      `Photorealistic mockup of ${description}, presented in a modern, minimalist studio setting with soft, diffused lighting.`,
      `Photorealistic mockup of ${description}, displayed in a lifestyle scene relevant to the product.`,
      `A creative shot of ${description} on a vibrant, single-color background with dramatic shadows.`,
    ];

    try {
      const ai = getAiClient();
      const prompt = `Based on the product description "${description}", generate 3 distinct, creative, and photorealistic mockup scene prompts for an e-commerce platform. Each prompt should be a single, concise sentence. Focus on different settings like lifestyle, studio, and abstract. Return ONLY the prompts as a valid JSON array of strings.`;

      const result = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              description: 'A single mockup prompt.',
            },
          },
        },
      });

      const jsonStr = (result.text ?? '').trim();
      const prompts = JSON.parse(jsonStr);
      if (
        Array.isArray(prompts) &&
        prompts.length > 0 &&
        prompts.every((p) => typeof p === 'string')
      ) {
        res.json({ prompts: prompts.slice(0, 3) });
        return;
      }
    } catch (err) {
      console.error('Failed to generate mockup prompts via AI, using fallback:', err);
    }

    res.json({ prompts: fallbackPrompts });
  });

  app.post('/api/gemini/generate-mockup', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, prompt } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        prompt?: string;
      };

      if (!imageBase64 || !mimeType || !prompt) {
        res.status(400).json({ error: 'imageBase64, mimeType, and prompt are required.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType,
              },
            },
            { text: prompt },
          ],
        },
        config: { responseModalities: [Modality.IMAGE] },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          res.json({
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          });
          return;
        }
      }

      res.status(502).json({ error: 'No image generated from image-to-image model.' });
    } catch (err) {
      console.error('Error in /api/gemini/generate-mockup:', err);
      res.status(getErrorStatus(err)).json({
        error: getErrorMessage(err, 'An error occurred during image generation.'),
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((req: Request, res: Response, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
