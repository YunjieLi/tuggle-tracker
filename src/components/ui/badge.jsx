import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, variant = 'secondary', ...props }) { return <span className={cn('ui-badge', `badge-${variant}`, className)} {...props} />; }
