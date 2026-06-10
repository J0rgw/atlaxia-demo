import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  id?: string;
}

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function ColorPicker({ value, onChange, label, id }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [textValue, setTextValue] = useState(value);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTextValue(v);
    if (HEX_REGEX.test(v)) {
      onChange(v);
    }
  };

  const handleTextBlur = () => {
    if (!HEX_REGEX.test(textValue)) {
      setTextValue(value);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    setTextValue(v);
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          {label}
        </label>
      )}
      <div
        className="flex items-center gap-2 border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5"
        style={{ borderLeftWidth: 4, borderLeftColor: value }}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-7 h-7 rounded border border-[var(--border-subtle)] cursor-pointer flex-shrink-0',
            'hover:ring-2 hover:ring-[var(--accent-primary)] hover:ring-offset-1 transition-shadow'
          )}
          style={{ backgroundColor: value }}
          aria-label={label ? `Pick ${label} color` : 'Pick color'}
        />
        <input
          ref={inputRef}
          id={id}
          type="color"
          value={value}
          onChange={handleColorChange}
          className="sr-only"
          tabIndex={-1}
        />
        <input
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          className="flex-1 min-w-0 text-sm font-readout text-[var(--text-primary)] bg-transparent outline-none"
          maxLength={7}
          aria-label={label ? `${label} hex value` : 'Hex color value'}
        />
      </div>
    </div>
  );
}
