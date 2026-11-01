import { router } from '@forge/bridge';
import type { MouseEvent, ReactNode } from 'react';

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
}

/**
 * Link for use inside the Forge iframe, which ignores a plain click on an
 * ordinary link. `router.open` asks the host page to open it instead. Clicks
 * with a modifier key stay with the browser, because those already work.
 */
function ExternalLink({ href, children }: ExternalLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    // Rejects if the viewer declines the host's confirmation, which needs no action.
    router.open(href).catch(() => {});
  };

  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={handleClick}>
      {children}
    </a>
  );
}

export default ExternalLink;
