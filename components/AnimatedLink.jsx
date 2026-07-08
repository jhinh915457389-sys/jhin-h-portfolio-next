'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AnimatedLink({
  href,
  children,
  onClick,
  transitionDirection = 'forward',
  ...props
}) {
  const pathname = usePathname();
  const hrefString = typeof href === 'string' ? href : href?.pathname ?? '';
  const transitionType = transitionDirection === 'back' ? 'nav-back' : 'nav-forward';

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || !hrefString || typeof window === 'undefined') return;

    const targetPath = new URL(hrefString, window.location.origin).pathname;
    if (targetPath === pathname && !hrefString.includes('#')) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Link href={href} onClick={handleClick} transitionTypes={[transitionType]} {...props}>
      {children}
    </Link>
  );
}
