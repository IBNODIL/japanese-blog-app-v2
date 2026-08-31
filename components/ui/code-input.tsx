"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CodeInputProps {
  value: string[];
  onChange: (code: string[]) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  length?: number;
}

const CodeInput = React.forwardRef<HTMLInputElement, CodeInputProps>(
  ({ value, onChange, onSubmit, disabled = false, length = 6 }, ref) => {
    const hiddenInputRef = React.useRef<HTMLInputElement>(null);
    const boxRefs = React.useRef<(HTMLDivElement | null)[]>([]);
    const [singleInput, setSingleInput] = React.useState("");

    const [focusedIndex, setFocusedIndex] = React.useState(0);

  const handleSingleInputChange = (inputValue: string) => {
      // Remove non-digits
      const digitsOnly = inputValue.replace(/\D/g, "").slice(0, length);
      setSingleInput(digitsOnly);

      // Convert to array format
      const codeArray = digitsOnly.split("").concat(Array(length).fill("")).slice(0, length);
      onChange(codeArray);

      // Update focused index to show where user is typing
      setFocusedIndex(Math.min(digitsOnly.length, length - 1));

      // Auto-submit if full code entered
      if (digitsOnly.length === length && onSubmit) {
        setTimeout(() => onSubmit(), 100);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const digitsOnly = pastedText.replace(/\D/g, "").slice(0, length);
      handleSingleInputChange(digitsOnly);
    };

    const handleBoxClick = () => {
      hiddenInputRef.current?.focus();
    };

    React.useEffect(() => {
      // Auto-focus hidden input on mount
      if (!disabled) {
        hiddenInputRef.current?.focus();
      }
    }, [disabled]);

    // Keep internal display state in sync with an externally-changed
    // `value` (e.g. a parent clearing the code after a failed attempt).
    // Only resync when the incoming value actually differs from what the
    // user is currently typing, so we don't fight the user's own input.
    React.useEffect(() => {
      const externalValue = value.join("").replace(/\D/g, "").slice(0, length);
      if (externalValue !== singleInput) {
        setSingleInput(externalValue);
        setFocusedIndex(Math.min(externalValue.length, length - 1));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, length]);

    // Forward the ref to the underlying (hidden) input so parents can
    // imperatively focus this component, while still keeping our own
    // internal ref for auto-focus/paste handling.
    React.useImperativeHandle(ref, () => hiddenInputRef.current as HTMLInputElement);

    return (
      <div className="w-full space-y-4">
        {/* Hidden input for paste and keyboard support */}
        <Input
          ref={hiddenInputRef}
          type="text"
          inputMode="numeric"
          value={singleInput}
          onChange={(e) => handleSingleInputChange(e.target.value)}
          onPaste={handlePaste}
          className="opacity-0 h-0 p-0 m-0 w-0 pointer-events-none absolute"
          maxLength={length}
          autoComplete="one-time-code"
          disabled={disabled}
          onFocus={() => setFocusedIndex(singleInput.length)}
        />

        {/* Visual display of individual digit boxes */}
        <div className="flex justify-center gap-2">
          {Array.from({ length }).map((_, index) => (
            <div
              key={index}
              ref={(el) => {
                boxRefs.current[index] = el;
              }}
              onClick={handleBoxClick}
              className={cn(
                "h-14 w-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all cursor-text relative",
                singleInput[index]
                  ? "border-primary bg-primary/10"
                  : "border-input bg-background",
                focusedIndex === index && !singleInput[index] && "pulse-border",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {singleInput[index] && <span>{singleInput[index]}</span>}
              {focusedIndex === index && !singleInput[index] && (
                <span className="absolute animate-pulse text-primary font-bold text-xl">|</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

CodeInput.displayName = "CodeInput";

export { CodeInput };
