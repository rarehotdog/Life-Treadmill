import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Clock3, ShieldAlert, X } from 'lucide-react';
import type { DecisionLogViewItem } from '../../types/app';
import { Badge, Button } from '../ui';

interface DecisionLogDetailSheetProps {
  isOpen: boolean;
  item: DecisionLogViewItem | null;
  onClose: () => void;
}

function formatDateTime(value: string | null): string {
  if (!value) return '기록 없음';
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

function formatSourceKind(sourceKind: DecisionLogViewItem['evidence'][number]['sourceKind']): string {
  if (sourceKind === 'calendar') return 'calendar';
  if (sourceKind === 'task') return 'task';
  if (sourceKind === 'note') return 'note';
  if (sourceKind === 'voice') return 'voice';
  return 'manual';
}

function formatExecutionStatus(status: DecisionLogViewItem['execution']['latestStatus']): {
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

function formatValidationReason(reason: string): { title: string; detail: string } {
  if (reason.includes('options must be at least 3')) {
    return {
      title: '옵션 개수 부족',
      detail: '대안 옵션을 최소 3개 이상 제시해야 합니다.',
    };
  }

  if (reason.includes('counter arguments')) {
    return {
      title: '반증 근거 부족',
      detail: '각 옵션에 대해 최소 2개의 반증이 필요합니다.',
    };
  }

  if (reason.includes('evidence must be at least 3')) {
    return {
      title: '근거 데이터 부족',
      detail: '결정 근거(Evidence)를 3개 이상 확보해야 합니다.',
    };
  }

  return {
    title: '검증 규칙 미충족',
    detail: reason,
  };
}

export default function DecisionLogDetailSheet({
  isOpen,
  item,
  onClose,
}: DecisionLogDetailSheetProps) {
  const executionStatus = formatExecutionStatus(item?.execution.latestStatus ?? 'pending');

  return (
    <AnimatePresence>
      {isOpen && item ? (
        <>
          <motion.div
            data-testid="decision-log-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40"
          />
          <motion.div
            data-testid="decision-log-detail-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="modal-sheet safe-bottom max-h-[84vh]"
          >
            <div className="modal-handle-wrap">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            <div className="modal-body overflow-y-auto pb-28">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="modal-title text-gray-900">Decision Detail</h2>
                  <p className="modal-subtle mt-1">
                    생성 {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <Button
                  data-testid="decision-log-detail-close"
                  variant="secondary"
                  size="icon"
                  onClick={onClose}
                  className="h-10 w-10 rounded-full bg-gray-100"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>

              <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
                <p className="caption-12 text-gray-500">Question</p>
                <p className="body-14 mt-1 font-semibold text-gray-900">{item.question}</p>
                <div className="mt-3 rounded-xl bg-violet-50 p-3">
                  <p className="caption-12 text-violet-600">Selected Option</p>
                  <p className="body-14 mt-1 font-semibold text-violet-900">
                    {item.selectedOptionTitle}
                  </p>
                  {item.options
                    .filter((option) => option.id === item.selectedOptionId)
                    .map((option) => (
                      <div key={option.id} className="mt-2 grid grid-cols-2 gap-2">
                        <p className="caption-12 text-violet-700">
                          Cost {option.estimatedCost}m
                        </p>
                        <p className="caption-12 text-violet-700">
                          Benefit {option.estimatedBenefit}
                        </p>
                      </div>
                    ))}
                </div>
              </section>

              <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
                <p className="heading-3 text-gray-900">Options & Counter Arguments</p>
                <div className="mt-3 space-y-2.5">
                  {item.options.map((option) => (
                    <div key={option.id} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="body-14 font-semibold text-gray-900">
                          {option.title}
                        </p>
                        {option.recommended ? (
                          <Badge className="rounded-full bg-violet-100 caption-11 font-semibold text-violet-700">
                            recommended
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="caption-12 rounded bg-gray-200 px-2 py-1 text-gray-700">
                          cost {option.estimatedCost}m
                        </span>
                        <span className="caption-12 rounded bg-gray-200 px-2 py-1 text-gray-700">
                          benefit {option.estimatedBenefit}
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1">
                        {option.counterArguments.map((argument) => (
                          <p key={`${option.id}-${argument}`} className="caption-12 text-gray-600">
                            • {argument}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
                <p className="heading-3 text-gray-900">Evidence Summary</p>
                <p className="caption-12 mt-1 text-gray-500">
                  sourceRef는 개인정보 보호를 위해 노출하지 않습니다.
                </p>
                <div className="mt-3 space-y-2">
                  {item.evidence.map((evidence) => (
                    <div key={evidence.id} className="rounded-xl bg-gray-50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="caption-12 rounded bg-gray-200 px-2 py-1 text-gray-700">
                          {formatSourceKind(evidence.sourceKind)}
                        </span>
                        <span className="caption-12 text-gray-400">
                          {formatDateTime(evidence.capturedAt)}
                        </span>
                      </div>
                      <p className="body-13 text-gray-800">{evidence.title}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
                <p className="heading-3 text-gray-900">Validation</p>
                <div className="mt-2 flex items-center gap-2">
                  {item.validation.pass ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                  )}
                  <p
                    className={`body-14 font-semibold ${
                      item.validation.pass ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {item.validation.pass ? '3/2/3 rule valid' : 'needs review'}
                  </p>
                </div>
                {item.validation.reasons.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {item.validation.reasons.map((reason) => {
                      const meta = formatValidationReason(reason);
                      return (
                        <div key={reason} className="rounded-lg bg-amber-50 p-2">
                          <p className="caption-12 font-semibold text-amber-800">
                            {meta.title}
                          </p>
                          <p className="caption-12 mt-0.5 text-amber-700">
                            {meta.detail}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="caption-12 mt-2 text-gray-500">
                    옵션/반증/근거 규칙을 모두 충족했습니다.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="heading-3 text-gray-900">Recent Execution</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge className={`rounded-full caption-11 font-semibold ${executionStatus.className}`}>
                    {executionStatus.label}
                  </Badge>
                  <span className="caption-12 text-gray-500">
                    {item.execution.totalExecutions}회 기록
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-gray-500" />
                  <p className="caption-12 text-gray-600">
                    실행 시각 {formatDateTime(item.execution.latestExecutedAt)}
                  </p>
                </div>
                {typeof item.execution.latestDelayMinutes === 'number' ? (
                  <p className="caption-12 mt-1 text-gray-500">
                    delay {item.execution.latestDelayMinutes}분
                  </p>
                ) : null}
              </section>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
