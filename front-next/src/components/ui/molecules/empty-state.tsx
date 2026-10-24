import React from "react";

import { Button } from "@/components/ui/atoms/button";
import { Icon, type IconName } from "@/components/icons";

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: IconName;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = "carta",
  title,
  description,
  actionLabel,
  actionIcon = "mas",
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-3xl border border-dashed border-border bg-card/70 px-6 py-14 text-center backdrop-blur-xs ${className}`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/70">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <p className="mt-4 text-lg font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Button onClick={onAction} variant="primary">
            <Icon name={actionIcon} className="h-4.5 w-4.5" />
            <span>{actionLabel}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
