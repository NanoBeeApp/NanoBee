// "NanoBee is thinking…" pending row shown while a reply is generated.
import { Icons } from '../../icons/icons';

export function ThinkingIndicator() {
  return (
    <div className="nb-msg" data-testid="assistant-thinking-indicator">
      <div className="nb-role">
        <span className="av ai"><Icons.bee size={13} sw={1.6} /></span> NanoBee
      </div>
      <div className="nb-thinking">
        <span className="nb-typing"><span /><span /><span /></span> 正在思考…
      </div>
    </div>
  );
}
