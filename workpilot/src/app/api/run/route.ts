import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { runWorkflow } from '@/lib/run';
import { addRunLog, getPilot, updatePilot } from '@/lib/store';
import type { RunLog } from '@/lib/types';

const runSchema = z.object({
  pilotId: z.string().min(1),
  values: z.record(z.string())
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = runSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || '요청이 올바르지 않습니다.' }, { status: 400 });
    }

    const pilot = getPilot(parsed.data.pilotId);
    if (!pilot) {
      return NextResponse.json({ error: 'Pilot을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (pilot.credits <= 0) {
      return NextResponse.json({ error: '크레딧이 부족합니다.' }, { status: 402 });
    }

    const updatedPilot = updatePilot(pilot.id, (prev) => ({
      ...prev,
      credits: Math.max(0, prev.credits - 1)
    }));

    if (!updatedPilot) {
      return NextResponse.json({ error: 'Pilot을 찾을 수 없습니다.' }, { status: 404 });
    }

    try {
      const result = await runWorkflow({
        pilot: updatedPilot,
        values: parsed.data.values
      });

      const runLog: RunLog = {
        id: randomUUID(),
        pilotId: updatedPilot.id,
        createdAt: new Date().toISOString(),
        inputValues: parsed.data.values,
        outputPreview: result.output.slice(0, 200),
        totalTokens: result.totalTokens,
        status: 'success'
      };

      addRunLog(runLog);

      return NextResponse.json({
        output: result.output,
        creditsLeft: updatedPilot.credits,
        totalTokens: result.totalTokens,
        runLog,
        mode: result.mode
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '실행 중 오류가 발생했습니다.';

      const runLog: RunLog = {
        id: randomUUID(),
        pilotId: updatedPilot.id,
        createdAt: new Date().toISOString(),
        inputValues: parsed.data.values,
        outputPreview: message.slice(0, 200),
        status: 'error'
      };

      addRunLog(runLog);

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '실행 요청 처리 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
