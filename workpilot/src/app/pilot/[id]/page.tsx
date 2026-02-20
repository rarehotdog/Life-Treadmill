import { RunnerPage } from '@/components/runner/runner-page';

export default function PilotRunnerPage({ params }: { params: { id: string } }) {
  return <RunnerPage pilotId={params.id} />;
}
