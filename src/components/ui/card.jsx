import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }) { return <section className={cn('ui-card', className)} {...props} />; }
export function CardContent({ className, ...props }) { return <div className={cn('ui-card-content', className)} {...props} />; }
