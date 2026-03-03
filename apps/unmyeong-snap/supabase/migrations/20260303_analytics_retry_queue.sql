-- Analytics delivery retry queue (Amplitude + Meta)

create table if not exists telemetry_delivery_queue (
  job_id bigserial primary key,
  event_id text not null references telemetry_events(event_id) on delete cascade,
  destination text not null check (destination in ('amplitude', 'meta')),
  status text not null check (status in ('pending', 'processing', 'sent', 'failed', 'dead')),
  attempt_count integer not null default 0,
  next_retry_at timestamptz not null,
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique(event_id, destination)
);

create index if not exists idx_telemetry_delivery_queue_status_next_retry
  on telemetry_delivery_queue(status, next_retry_at);

create index if not exists idx_telemetry_delivery_queue_event_destination
  on telemetry_delivery_queue(event_id, destination);
