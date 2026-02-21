import { randomUUID } from 'crypto';

import { z } from 'zod';

import { buildDefaultName, compileWorkflow } from '@/lib/compile';
import { savePilot } from '@/lib/store';
import { getRequestId, jsonWithRequestId } from '@/lib/request';
import type { Pilot, RecordMode } from '@/lib/types';

export const runtime = 'nodejs';

const createModeSchema = z.enum(['capture', 'describe', 'prompt']);

function formValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  return `data:${file.type};base64,${base64}`;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const formData = await request.formData();

    const name = buildDefaultName(formValue(formData, 'name'));
    const modeValue = formValue(formData, 'recordMode') || 'describe';

    const modeParse = createModeSchema.safeParse(modeValue);
    if (!modeParse.success) {
      return jsonWithRequestId({ error: 'recordMode 값이 올바르지 않습니다.' }, requestId, { status: 400 });
    }

    const recordMode = modeParse.data as RecordMode;

    const captureFileEntry = formData.get('captureFile');
    let captureDataUrl: string | undefined;

    if (captureFileEntry instanceof File && captureFileEntry.size > 0) {
      if (!captureFileEntry.type.startsWith('image/')) {
        return jsonWithRequestId({ error: '이미지 파일만 업로드할 수 있습니다.' }, requestId, { status: 400 });
      }
      if (captureFileEntry.size > 5 * 1024 * 1024) {
        return jsonWithRequestId({ error: '이미지 파일은 5MB 이하만 허용됩니다.' }, requestId, { status: 400 });
      }
      captureDataUrl = await fileToDataUrl(captureFileEntry);
    }

    const record: Pilot['record'] = {
      taskDescription: formValue(formData, 'taskDescription'),
      prompt: formValue(formData, 'prompt'),
      inputsCsv: formValue(formData, 'inputsCsv'),
      exampleInput: formValue(formData, 'exampleInput'),
      exampleOutput: formValue(formData, 'exampleOutput'),
      captureDataUrl,
      captureNote: formValue(formData, 'captureNote')
    };

    const { spec, mode } = await compileWorkflow({
      name,
      recordMode,
      record
    });

    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const pilot: Pilot = {
      id,
      name,
      oneLiner: spec.oneLiner,
      recordMode,
      record,
      inputs: spec.inputs,
      steps: spec.steps,
      credits: 50,
      version: 1,
      createdAt
    };

    await savePilot(pilot, { requestId });

    return jsonWithRequestId(
      {
        pilot,
        url: `/pilot/${id}`,
        compileMode: mode,
      },
      requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pilot 생성 중 오류가 발생했습니다.';
    console.error(`[api/pilots] requestId=${requestId} error=${message}`);
    return jsonWithRequestId({ error: message }, requestId, { status: 500 });
  }
}
