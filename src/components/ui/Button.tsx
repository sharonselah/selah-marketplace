import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong shadow-card',
  secondary: 'bg-brand-soft text-brand hover:brightness-95',
  outline: 'bg-surface text-text shadow-card hover:shadow-raised',
  ghost: 'text-text hover:bg-surface-2',
  danger: 'bg-bad text-white hover:brightness-110',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

const base =
  'inline-flex items-center justify-center rounded-full font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  loading,
  className,
  children,
  type = 'button',
  ...rest
}: StyleProps & { loading?: boolean } & ComponentProps<'button'>) {
  return (
    <button type={type} className={cn(base, VARIANT[variant], SIZE[size], block && 'w-full', className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({ variant = 'primary', size = 'md', block, icon, className, children, ...rest }: StyleProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, VARIANT[variant], SIZE[size], block && 'w-full', className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
