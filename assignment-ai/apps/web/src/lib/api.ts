import { AskIn, AskOut, EditIn, EditOut } from '@assignment-ai/shared';

// Bypass Next.js proxy to avoid timeout issues
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export async function askAPI(payload: AskIn): Promise<AskOut> {
  const response = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function editAPI(payload: EditIn): Promise<EditOut> {
  console.log('[API] Calling /edit with payload:', { 
    docSliceLength: payload.docSlice.length,
    range: payload.range,
    instructions: payload.instructions 
  });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
  
  try {
    const response = await fetch(`${API_BASE}/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[API] Error response:', error);
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[API] Success:', result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out after 2 minutes');
    }
    throw err;
  }
}

