// On/off switch using the design system's `.toggle` classes.
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
}

export function Toggle({ checked, onChange, testId }: ToggleProps) {
  return (
    <label className="toggle" onClick={(e) => e.stopPropagation()} data-testid={testId}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" /><span className="thumb" />
    </label>
  );
}
