import type { InputField } from '@/lib/types';

function normalizeKey(text: string): string {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'input_value';
}

function parseBoolean(text: string): boolean {
  const value = text.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'y' || value === '필수';
}

export function parseInputsCsv(inputsCsv?: string): InputField[] {
  if (!inputsCsv?.trim()) return [];

  const rows = inputsCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fields: InputField[] = [];

  rows.forEach((row, index) => {
    const cells = row.split(',').map((cell) => cell.trim());
    if (index === 0 && cells[0]?.toLowerCase() === 'key') {
      return;
    }

    if (cells.length === 1) {
      const key = normalizeKey(cells[0]);
      fields.push({
        key,
        label: cells[0],
        required: true,
        placeholder: `${cells[0]} 입력`
      });
      return;
    }

    const [rawKey, rawLabel, rawRequired, rawPlaceholder] = cells;
    const key = normalizeKey(rawKey || rawLabel || `field_${index + 1}`);
    const label = rawLabel || rawKey || `입력값 ${index + 1}`;

    fields.push({
      key,
      label,
      required: rawRequired ? parseBoolean(rawRequired) : true,
      placeholder: rawPlaceholder || undefined
    });
  });

  const unique = new Map<string, InputField>();
  fields.forEach((field) => {
    if (!unique.has(field.key)) {
      unique.set(field.key, field);
    }
  });

  return [...unique.values()];
}

export function ensureMinimumInputs(inputs: InputField[]): InputField[] {
  if (inputs.length > 0) {
    return inputs;
  }

  return [
    {
      key: 'source_text',
      label: '원본 데이터',
      required: true,
      placeholder: '요약할 텍스트나 핵심 데이터를 입력하세요'
    }
  ];
}
