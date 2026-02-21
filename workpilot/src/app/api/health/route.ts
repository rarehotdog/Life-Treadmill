import { jsonWithRequestId, getRequestId } from '@/lib/request';
import { isOpenAIConfigured } from '@/lib/openai';
import { getStorageHealth } from '@/lib/store';

const APP_VERSION = process.env.npm_package_version || '0.1.0';

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const storageHealth = await getStorageHealth({ requestId });

    return jsonWithRequestId(
      {
        ok: true,
        version: APP_VERSION,
        storageMode: storageHealth.storageMode,
        dbReachable: storageHealth.dbReachable,
        openAIConfigured: isOpenAIConfigured(),
        fallbackReason: storageHealth.fallbackReason,
      },
      requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'health check failed';
    return jsonWithRequestId(
      {
        ok: false,
        version: APP_VERSION,
        storageMode: 'memory-fallback',
        dbReachable: false,
        openAIConfigured: isOpenAIConfigured(),
        error: message,
      },
      requestId,
      { status: 500 },
    );
  }
}
