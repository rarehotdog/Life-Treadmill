import { createClient } from '@supabase/supabase-js';

import type { Pilot, RunLog } from '@/lib/types';
import type {
  CommitRunInput,
  CommitRunResult,
  PilotStoreAdapter,
  StoreContext,
} from '@/lib/store-contract';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

type PilotRow = {
  id: string;
  name: string;
  one_liner: string;
  record_mode: Pilot['recordMode'];
  record: Pilot['record'];
  inputs: Pilot['inputs'];
  steps: Pilot['steps'];
  credits: number;
  version: number;
  created_at: string;
  updated_at: string;
};

type RunLogRow = {
  id: string;
  pilot_id: string;
  created_at: string;
  input_values: Record<string, string>;
  output_preview: string;
  total_tokens: number | null;
  status: RunLog['status'];
};

type CommitRunRpcRow = {
  ok: boolean;
  reason: string;
  credits_left: number | null;
};

function getClient() {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  return supabase;
}

function toPilotRow(pilot: Pilot): PilotRow {
  return {
    id: pilot.id,
    name: pilot.name,
    one_liner: pilot.oneLiner,
    record_mode: pilot.recordMode,
    record: pilot.record,
    inputs: pilot.inputs,
    steps: pilot.steps,
    credits: pilot.credits,
    version: pilot.version,
    created_at: pilot.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function toPilot(row: PilotRow): Pilot {
  return {
    id: row.id,
    name: row.name,
    oneLiner: row.one_liner,
    recordMode: row.record_mode,
    record: row.record,
    inputs: row.inputs,
    steps: row.steps,
    credits: row.credits,
    version: row.version,
    createdAt: row.created_at,
  };
}

function toRunLog(row: RunLogRow): RunLog {
  return {
    id: row.id,
    pilotId: row.pilot_id,
    createdAt: row.created_at,
    inputValues: row.input_values,
    outputPreview: row.output_preview,
    totalTokens: row.total_tokens ?? undefined,
    status: row.status,
  };
}

export const supabaseStore: PilotStoreAdapter = {
  adapterName: 'supabase',

  isConfigured(): boolean {
    return !!supabase;
  },

  async ping(_context?: StoreContext): Promise<boolean> {
    if (!supabase) return false;

    const client = getClient();
    const { error } = await client.from('app_meta').select('key').limit(1);
    return !error;
  },

  async savePilot(pilot: Pilot, _context?: StoreContext): Promise<Pilot> {
    const client = getClient();
    const row = toPilotRow(pilot);

    const { data, error } = await client
      .from('pilots')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return toPilot(data as PilotRow);
  },

  async getPilot(id: string, _context?: StoreContext): Promise<Pilot | undefined> {
    const client = getClient();

    const { data, error } = await client
      .from('pilots')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;

    return toPilot(data as PilotRow);
  },

  async updatePilot(
    id: string,
    updater: (pilot: Pilot) => Pilot,
    context?: StoreContext,
  ): Promise<Pilot | undefined> {
    const existing = await this.getPilot(id, context);
    if (!existing) return undefined;

    const updated = updater(existing);
    return this.savePilot(updated, context);
  },

  async getRunLogs(pilotId: string, limit: number, _context?: StoreContext): Promise<RunLog[]> {
    const client = getClient();

    const { data, error } = await client
      .from('run_logs')
      .select('id,pilot_id,created_at,input_values,output_preview,total_tokens,status')
      .eq('pilot_id', pilotId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as RunLogRow[]).map(toRunLog);
  },

  async commitRun(input: CommitRunInput, _context?: StoreContext): Promise<CommitRunResult> {
    const client = getClient();

    const { data, error } = await client.rpc('commit_run_log', {
      p_pilot_id: input.pilotId,
      p_run_log_id: input.log.id,
      p_created_at: input.log.createdAt,
      p_actor: 'anonymous',
      p_input_values: input.log.inputValues,
      p_output_preview: input.log.outputPreview,
      p_total_tokens: input.log.totalTokens ?? null,
      p_status: input.log.status,
    });

    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as CommitRunRpcRow | undefined;

    if (!row) {
      throw new Error('SUPABASE_COMMIT_RUN_EMPTY');
    }

    if (!row.ok) {
      if (row.reason === 'not_found') {
        return { status: 'not_found' };
      }
      if (row.reason === 'insufficient_credits') {
        return { status: 'insufficient_credits' };
      }
      throw new Error(`SUPABASE_COMMIT_RUN_FAILED:${row.reason}`);
    }

    return {
      status: 'success',
      creditsLeft: row.credits_left ?? 0,
    };
  },

  async deleteRunLogsOlderThan(cutoffIso: string, _context?: StoreContext): Promise<number> {
    const client = getClient();

    const { data, error } = await client
      .from('run_logs')
      .delete()
      .lt('created_at', cutoffIso)
      .select('id');

    if (error) throw error;

    return data?.length ?? 0;
  },

  async getMeta<T = unknown>(key: string, _context?: StoreContext): Promise<T | undefined> {
    const client = getClient();

    const { data, error } = await client
      .from('app_meta')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    return (data as { value: T } | null)?.value;
  },

  async setMeta<T = unknown>(key: string, value: T, _context?: StoreContext): Promise<void> {
    const client = getClient();

    const { error } = await client.from('app_meta').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },
};
