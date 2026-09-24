import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogHeader = ({ className, ...props }) => <div className={cn('dialog-header', className)} {...props} />;
export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description;
export const DialogFooter = ({ className, ...props }) => <div className={cn('dialog-footer', className)} {...props} />;

export function DialogContent({ className, children, ...props }) {
  return <RadixDialog.Portal>
    <RadixDialog.Overlay className="dialog-overlay" />
    <RadixDialog.Content className={cn('dialog-content', className)} {...props}>
      {children}
      <RadixDialog.Close className="dialog-close" aria-label="Close"><X size={17}/></RadixDialog.Close>
    </RadixDialog.Content>
  </RadixDialog.Portal>;
}
