import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

export default function Card({ children, padding = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface dark:bg-charcoal rounded-2xl shadow-sm border border-border-light dark:border-border-dark ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
