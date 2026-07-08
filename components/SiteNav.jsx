import { Camera } from 'lucide-react';
import { AnimatedLink } from './AnimatedLink';
import { AppIcon } from './Icon';

export function SiteNav() {
  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="site-nav">
        <AnimatedLink className="brand-lockup" href="/" transitionDirection="back" aria-label="回到首页">
          <span className="brand-icon" aria-hidden="true">
            <AppIcon icon={Camera} size="sm" />
          </span>
          <span className="brand-name-full">Jhin H Creative Portfolio</span>
          <span className="brand-name-short">Jhin H</span>
        </AnimatedLink>
        <nav className="nav-links" aria-label="主导航">
          <AnimatedLink href="/portfolio" transitionDirection="forward">作品集</AnimatedLink>
          <a href="#contact">联系我</a>
        </nav>
      </header>
    </>
  );
}
