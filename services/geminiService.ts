const getBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const getMimeType = (file: File): string => {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : `Request failed with status ${response.status}`
    );
  }
  return data as T;
}

export const describeImage = async (imageFile: File): Promise<string> => {
  const imageBase64 = await getBase64(imageFile);
  const mimeType = getMimeType(imageFile);
  const data = await postJson<{ description: string }>('/api/gemini/describe', {
    imageBase64,
    mimeType,
  });
  return data.description;
};

export const generateMockupPrompts = async (description: string): Promise<string[]> => {
  const data = await postJson<{ prompts: string[] }>('/api/gemini/mockup-prompts', {
    description,
  });
  return data.prompts;
};

export const generateImageFromImage = async (
  imageFile: File,
  prompt: string
): Promise<string> => {
  const imageBase64 = await getBase64(imageFile);
  const mimeType = getMimeType(imageFile);
  const data = await postJson<{ imageBase64: string }>('/api/gemini/generate-mockup', {
    imageBase64,
    mimeType,
    prompt,
  });
  return data.imageBase64;
};