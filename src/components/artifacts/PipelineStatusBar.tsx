// Non-blocking pipeline status strip for a data view detail. Shows a thin honey
// progress bar + label while the view is fetching, an error notice on failure,
// and renders nothing once ready. Pure render.
import type { PipelineStatus } from '../../artifacts/types';
import { pipelineStatusLabel } from '../../artifacts/format';
import { Icons } from '../../icons/icons';

interface Props {
  status: PipelineStatus;
  errorText?: string;
}

export function PipelineStatusBar({ status, errorText }: Props) {
  if (status === 'ready') return null;

  if (status === 'error') {
    return (
      <div className="nb-dv-status nb-dv-status-error" data-testid="data-view-status">
        <Icons.x size={14} />
        <span>{errorText || '数据视图拉取失败，请稍后刷新重试'}</span>
      </div>
    );
  }

  // pending / fetching / filtering / extracting / templating — in progress.
  return (
    <div className="nb-dv-status" data-testid="data-view-status">
      <div className="nb-dv-progress"><div className="nb-dv-progress-fill" /></div>
      <span className="nb-dv-status-text">
        <Icons.spark size={13} /> {pipelineStatusLabel(status)}
      </span>
    </div>
  );
}
