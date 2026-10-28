import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className,
  style,
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-card',
    circular: 'rounded-full',
    text: 'rounded h-4 my-1',
  };

  return (
    <div
      role="status"
      aria-label="Loading..."
      aria-busy="true"
      className={cn('animate-pulse bg-sand-200', variantStyles[variant], className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

Skeleton.displayName = 'Skeleton';
