import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-black hover:bg-brand-hover focus:ring-brand/50',
  secondary:
    'bg-ink text-white hover:bg-black dark:bg-cloud dark:text-black dark:hover:bg-white focus:ring-ink/30',
  ghost:
    'bg-transparent text-ink hover:bg-surface-hover dark:text-cloud dark:hover:bg-charcoal-hover focus:ring-ink/20',
  danger:
    'bg-error text-white hover:bg-red-600 dark:bg-error-dark dark:text-black focus:ring-error/30',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-midnight disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
