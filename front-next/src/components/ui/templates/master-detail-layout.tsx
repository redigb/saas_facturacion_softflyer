import React from "react";

export interface MasterDetailLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function MasterDetailLayout({
  sidebar,
  content,
  className = "",
}: MasterDetailLayoutProps) {
  return (
    <div className={`grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_1fr] lg:gap-8 ${className}`}>
      <aside className="w-full lg:sticky lg:top-6">{sidebar}</aside>
      <main className="min-w-0">{content}</main>
    </div>
  );
}
