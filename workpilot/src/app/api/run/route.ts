import { randomUUID } from 'crypto';

import { z } from 'zod';

import { jsonWithRequestId, getRequestId } from '@/lib/request';
import { cleanupRunLogsOlderThan90Days } from '@/lib/retention';
import { runWorkflow } from '@/lib/run';
import { commitRun, getPilot } from '@/lib/store';
import type { RunLog } from '@/lib/types';

const runSchema = z.object({
  pilotId: z.string().min(1),
  values: z.record(z.string()),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    await cleanupRunLogsOlderThan90Days({ requestId });

    const body = await request.json();
    const parsed = runSchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithRequestId(
        { error: parsed.error.issues[0]?.message || '요청이 올바르지 않습니다.' },
        requestId,
        { status: 400 },
      );
    }

    const pilot = await getPilot(parsed.data.pilotId, { requestId });
    if (!pilot) {
      return jsonWithRequestId({ error: 'Pilot을 찾을 수 없습니다.' }, requestId, { status: 404 });
    }

    if (pilot.credits <= 0) {
      return jsonWithRequestId({ error: '크레딧이 부족합니다.' }, requestId, { status: 402 });
    }

    try {
      const result = await runWorkflow({
        pilot,
        values: parsed.data.values,
      });

      const runLog: RunLog = {
        id: randomUUID(),
        pilotId: pilot.id,
        createdAt: new Date().toISOString(),
        inputValues: parsed.data.values,
        outputPreview: result.output.slice(0, 200),
        totalTokens: result.totalTokens,
        status: 'success',
      };

      const commitResult = await commitRun(
        {
          pilotId: pilot.id,
          log: runLog,
        },
        { requestId },
      );

      if (commitResult.status === 'not_found') {
        return jsonWithRequestId({ error: 'Pilot을 찾을 수 없습니다.' }, requestId, { status: 404 });
      }

      if (commitResult.status === 'insufficient_credits') {
        return jsonWithRequestId({ error: '크레딧이 부족합니다.' }, requestId, { status: 402 });
      }

      return jsonWithRequestId(
        {
          output: result.output,
          creditsLeft: commitResult.creditsLeft,
          totalTokens: result.totalTokens,
          runLog,
          mode: result.mode,
        },
        requestId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '실행 중 오류가 발생했습니다.';

      const runLog: RunLog = {
        id: randomUUID(),
        pilotId: pilot.id,
        createdAt: new Date().toISOString(),
        inputValues: parsed.data.values,
        outputPreview: message.slice(0, 200),
        status: 'error',
      };

      const commitResult = await commitRun(
        {
          pilotId: pilot.id,
          log: runLog,
        },
        { requestId },
      );

      if (commitResult.status === 'not_found') {
        return jsonWithRequestId({ error: 'Pilot을 찾을 수 없습니다.' }, requestId, { status: 404 });
      }

      if (commitResult.status === 'insufficient_credits') {
        return jsonWithRequestId({ error: '크레딧이 부족합니다.' }, requestId, { status: 402 });
      }

      console.error(`[api/run] requestId=${requestId} run_error=${message}`);
      return jsonWithRequestId(
        {
          error: message,
          creditsLeft: commitResult.creditsLeft,
          runLog,
        },
        requestId,
        { status: 500 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '실행 요청 처리 중 오류가 발생했습니다.';
    console.error(`[api/run] requestId=${requestId} fatal=${message}`);
    return jsonWithRequestId({ error: message }, requestId, { status: 500 });
  }
}
