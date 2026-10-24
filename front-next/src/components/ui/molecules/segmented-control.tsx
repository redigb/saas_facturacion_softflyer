import React from "react";

import { Icon, type IconName } from "@/components/icons";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      className={`inline-flex items-center rounded-2xl border border-border bg-card p-1 shadow-2xs ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex h-9.5 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all active:scale-[0.98] ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            {option.icon ? <Icon name={option.icon} className="h-4 w-4" /> : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
