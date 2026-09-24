import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva('ui-button', {
  variants: {
    variant: {
      default: 'button-default', outline: 'button-outline', secondary: 'button-secondary', ghost: 'button-ghost',
    },
    size: { default: 'button-md', sm: 'button-sm', icon: 'button-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export const Button = React.forwardRef(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';
