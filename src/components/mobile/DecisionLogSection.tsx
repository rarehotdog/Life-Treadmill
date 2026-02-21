import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ListTree, Search, TriangleAlert } from 'lucide-react';
import type { DecisionLogViewItem } from '../../types/app';
import { Badge, Button, Card, CardContent, Input } from '../ui';

type ValidationFilter = 'all' | 'valid' | 'needs-review';
type StatusFilter =
  | 'all'
  | 'applied'
  | 'delayed'
  | 'skipped'
  | 'pending';

interface DecisionLogSectionProps {
  items: DecisionLogViewItem[];
  windowDays?: number;
  lastUpdatedAt?: string | null;
  onOpenItem: (item: DecisionLogViewItem) => void;
}

function formatDateTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;

  return new Date(parsed).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatStatus(status: DecisionLogViewItem['execution']['latestStatus']): {
  label: string;
  className: string;
} {
  if (status === 'applied') {
    return {
      label: 'applied',
      className: 'bg-emerald-50 text-emerald-700',
    };
  }
  if (status === 'delayed') {
    return {
      label: 'delayed',
      className: 'bg-amber-50 text-amber-700',
    };
  }
  if (status === 'skipped') {
    return {
      label: 'skipped',
      className: 'bg-slate-100 text-slate-700',
    };
  }

  return {
    label: 'pending',
    className: 'bg-violet-50 text-violet-700',
  };
}

export default function DecisionLogSection({
  items,
  windowDays = 14,
  lastUpdatedAt,
  onOpenItem,
}: DecisionLogSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [validationFilter, setValidationFilter] = useState<ValidationFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedWindowDays, setSelectedWindowDays] = useState<14 | 30>(14);

  const activeWindowDays = windowDays >= 30 ? selectedWindowDays : 14;

  const windowFilteredItems = useMemo(() => {
    const now = Date.now();
    const windowMs = activeWindowDays * 24 * 60 * 60 * 1000;

    return items.filter((item) => {
      const createdAt = Date.parse(item.createdAt);
      if (Number.isNaN(createdAt)) return false;
      return now - createdAt <= windowMs;
    });
  }, [activeWindowDays, items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return windowFilteredItems.filter((item) => {
      const passValidation =
        validationFilter === 'all'
          ? true
          : validationFilter === 'valid'
            ? item.validation.pass
            : !item.validation.pass;

      const passStatus =
        statusFilter === 'all'
          ? true
          : item.execution.latestStatus === statusFilter;

      if (!passValidation || !passStatus) return false;
      if (!normalizedQuery) return true;

      const haystack = `${item.question} ${item.selectedOptionTitle}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [searchQuery, statusFilter, validationFilter, windowFilteredItems]);

  const visibleItems = useMemo(
    () => (expanded ? filteredItems : filteredItems.slice(0, 5)),
    [expanded, filteredItems],
  );
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    validationFilter !== 'all' ||
    statusFilter !== 'all' ||
    (windowDays >= 30 && selectedWindowDays !== 14);

  return (
    <Card data-testid="decision-log-section" className="rounded-2xl border-gray-100 shadow-sm">
      <CardContent className="card-padding">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="heading-3 text-gray-900">Decision Log</h3>
            <p className="caption-12 mt-0.5 text-gray-500">
              최근 {activeWindowDays}일 의사결정 기록
            </p>
          </div>
          <div className="rounded-lg bg-violet-50 px-2 py-1 caption-12 font-semibold text-violet-700">
            {filteredItems.length}건
          </div>
        </div>

        {lastUpdatedAt ? (
          <p className="caption-12 mb-3 text-gray-400">
            마지막 갱신 {formatDateTime(lastUpdatedAt)}
          </p>
        ) : null}

        {windowDays >= 30 ? (
          <div className="mb-3 inline-flex rounded-lg bg-gray-100 p-1">
            {[14, 30].map((days) => (
              <button
                key={days}
                type="button"
                data-testid={`decision-log-window-${days}`}
                onClick={() => {
                  setSelectedWindowDays(days as 14 | 30);
                  setExpanded(false);
                }}
                className={`rounded-md px-3 py-1 caption-12 font-semibold transition-colors ${
                  selectedWindowDays === days
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {days}일
              </button>
            ))}
          </div>
        ) : null}

        <div className="mb-3 space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              data-testid="decision-log-search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setExpanded(false);
              }}
              placeholder="질문/선택 옵션 검색"
              className="h-9 rounded-lg border-gray-200 bg-white pl-8 body-13"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: '전체' },
                { key: 'valid', label: 'valid' },
                { key: 'needs-review', label: 'needs-review' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  data-testid={`decision-log-validation-${filter.key}`}
                  onClick={() => {
                    setValidationFilter(filter.key as ValidationFilter);
                    setExpanded(false);
                  }}
                  className={`rounded-full px-2.5 py-1 caption-11 font-semibold ${
                    validationFilter === filter.key
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: 'status:all' },
                { key: 'applied', label: 'applied' },
                { key: 'delayed', label: 'delayed' },
                { key: 'skipped', label: 'skipped' },
                { key: 'pending', label: 'pending' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  data-testid={`decision-log-status-${filter.key}`}
                  onClick={() => {
                    setStatusFilter(filter.key as StatusFilter);
                    setExpanded(false);
                  }}
                  className={`rounded-full px-2.5 py-1 caption-11 font-semibold ${
                    statusFilter === filter.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                data-testid="decision-log-reset-filters"
                onClick={() => {
                  setSearchQuery('');
                  setValidationFilter('all');
                  setStatusFilter('all');
                  setSelectedWindowDays(14);
                  setExpanded(false);
                }}
                className="caption-11 font-semibold text-gray-500 underline underline-offset-2"
              >
                필터 초기화
              </button>
            ) : null}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div
            data-testid="decision-log-empty"
            className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4"
          >
            {items.length === 0 ? (
              <>
                <p className="body-14 font-medium text-gray-700">
                  아직 Decision Log가 없어요.
                </p>
                <p className="caption-12 mt-1 text-gray-500">
                  퀘스트 생성/재생성 이후 의사결정 기록이 쌓입니다.
                </p>
              </>
            ) : (
              <>
                <p className="body-14 font-medium text-gray-700">
                  필터 조건에 맞는 기록이 없어요.
                </p>
                <p className="caption-12 mt-1 text-gray-500">
                  기간/상태/검색 조건을 조정해 다시 확인해보세요.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleItems.map((item) => {
              const statusMeta = formatStatus(item.execution.latestStatus);
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid="decision-log-item"
                  onClick={() => onOpenItem(item)}
                  className="w-full rounded-xl border border-gray-100 bg-white p-3 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="caption-12 text-gray-500">
                      {formatDateTime(item.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`rounded-full caption-11 font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </Badge>
                      <Badge
                        className={`rounded-full caption-11 font-semibold ${
                          item.validation.pass
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.validation.pass ? 'valid' : 'needs-review'}
                      </Badge>
                    </div>
                  </div>
                  <p className="body-14 font-semibold text-gray-900 line-clamp-1">
                    {item.question}
                  </p>
                  <p className="caption-12 mt-1 text-gray-600 line-clamp-1">
                    선택: {item.selectedOptionTitle}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {filteredItems.length > 5 ? (
          <Button
            data-testid="decision-log-toggle"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => setExpanded((previous) => !previous)}
          >
            <ListTree className="h-4 w-4" />
            {expanded ? '최근 5개만 보기' : '전체 보기'}
          </Button>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-50 p-2.5">
            <p className="caption-12 text-emerald-600">Validation</p>
            <div className="mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <p className="body-13 font-semibold text-emerald-700">
                {windowFilteredItems.filter((item) => item.validation.pass).length} valid
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 p-2.5">
            <p className="caption-12 text-amber-600">Review</p>
            <div className="mt-1 flex items-center gap-1">
              <TriangleAlert className="h-3.5 w-3.5 text-amber-600" />
              <p className="body-13 font-semibold text-amber-700">
                {windowFilteredItems.filter((item) => !item.validation.pass).length} needs review
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2 rounded-xl bg-slate-50 p-2.5">
          <p className="caption-12 text-slate-500">최근 실행</p>
          <div className="mt-1 flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-slate-500" />
            <p className="body-13 text-slate-700">
              최신 기록의 실행 상태를 기준으로 회고를 제공합니다.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
