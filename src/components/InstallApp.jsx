import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { isStandalone, promptInstall } from '../lib/install';

export function InstallApp({ language }) {
  const [open, setOpen] = useState(false);
  const zh = language === 'zh';
  const label = zh ? '安装应用' : 'Install app';
  if (isStandalone()) return null;

  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="install-app-button" onClick={async event => {
          event.preventDefault();
          if (!await promptInstall()) setOpen(true);
        }}>{label}</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
        <DialogDescription asChild><div className="install-instructions">
          <p>{zh ? 'iPhone：在 Safari 中，点「分享」→「添加到主屏幕」，如果看到「作为网页 App 打开」，请开启它。' : 'iPhone: In Safari, tap Share → Add to Home Screen. If you see Open as Web App, turn it on.'}</p>
          <p>{zh ? 'Android：在 Chrome 中打开 ⋮ 菜单，选择「添加到主屏幕」或「安装应用」。' : 'Android: In Chrome, open the ⋮ menu and choose Add to Home screen or Install app.'}</p>
        </div></DialogDescription>
        <DialogFooter><Button onClick={() => setOpen(false)}>{zh ? '完成' : 'Done'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>;
}
