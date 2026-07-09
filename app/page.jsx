import { ArrowRight, Sparkles } from 'lucide-react';
import { ViewTransition } from 'react';
import { AnimatedLink } from '@/components/AnimatedLink';
import { ContactSection } from '@/components/ContactSection';
import { Footer } from '@/components/Footer';
import { AppIcon } from '@/components/Icon';
import { PortfolioBrowser } from '@/components/PortfolioBrowser';
import { SiteNav } from '@/components/SiteNav';
import { withBasePath } from '@/lib/sitePath';
import {
  getCategories,
  getFeaturedItems,
  getMilestoneItem,
  getPdfPages,
  getPortfolioItems,
  getProjectDetails,
  getProfile,
} from '@/lib/portfolio';

export default function HomePage() {
  const profile = getProfile();
  const items = getPortfolioItems();
  const featuredItems = getFeaturedItems();
  const milestone = getMilestoneItem();
  const categories = getCategories(items);
  const pdfPages = getPdfPages();
  const projectDetails = getProjectDetails();

  return (
    <>
      <SiteNav />
      <ViewTransition
        enter={{ 'nav-forward': 'route-forward', 'nav-back': 'route-back', default: 'none' }}
        exit={{ 'nav-forward': 'route-forward', 'nav-back': 'route-back', default: 'none' }}
        default="none"
      >
        <main id="main-content">
          <section className="hero">
            <img
              className="hero-bg"
              src={withBasePath('/assets/site/hero.jpg')}
              alt=""
              aria-hidden="true"
              width="2560"
              height="1440"
              fetchPriority="high"
              decoding="async"
            />
            <div className="hero-vignette" />
            <div className="hero-content">
              <span className="hero-mark">Visual Content Creator</span>
              <h1>
                <span className="hero-name-zh">{profile.nameZh}</span>
                <span className="hero-name-en">{profile.nameEn}</span>
              </h1>
              <p className="hero-role">{profile.role}</p>
              <p className="hero-summary">{profile.summary}</p>
              <div className="hero-actions">
                <AnimatedLink className="primary-button" href="/portfolio" transitionDirection="forward">
                  查看作品
                  <AppIcon icon={ArrowRight} size="sm" />
                </AnimatedLink>
                <a className="ghost-button" href="#contact">联系我</a>
              </div>
            </div>
          </section>

          <section className="skill-section section-shell">
            <div className="section-heading">
              <span className="section-kicker">CAPABILITIES</span>
              <h2>从影像拍摄到视觉落地的复合能力</h2>
            </div>
            <div className="skill-grid">
              {profile.skills.map((skill) => (
                <span key={skill} className="skill-pill">
                  <AppIcon icon={Sparkles} size="xs" />
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className="section-shell featured-section">
            <div className="section-heading split">
              <div>
                <span className="section-kicker">SELECTED WORKS</span>
                <h2>精选作品</h2>
              </div>
            </div>
            <PortfolioBrowser
              items={items}
              categories={categories}
              pdfPages={pdfPages}
              projectDetails={projectDetails}
              initialItems={featuredItems}
              mode="home"
            />
            <div className="featured-more">
              <AnimatedLink href="/portfolio" className="text-link" transitionDirection="forward">
                全部作品
                <AppIcon icon={ArrowRight} size="xs" />
              </AnimatedLink>
            </div>
          </section>

          {milestone && (
            <section className="milestone section-shell">
              <div className="milestone-media">
                <img
                  src={withBasePath('/assets/site/milestone-乘翼归来-award.jpg')}
                  alt="微电影-乘翼归来-广东省一等奖"
                  width="1920"
                  height="1080"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="milestone-copy">
                <span className="section-kicker">REPRESENTATIVE PROJECT</span>
                <h2 className="milestone-title">
                  <span className="milestone-title-main">微电影-乘翼归来</span>
                  <span className="milestone-title-award">广东省一等奖</span>
                </h2>
                <p>
                  “乘翼归来”作为影视后期代表项目，覆盖前期策划、拍摄与后期剪辑落地，展示叙事节奏、画面组织和完整交付能力。
                </p>
                <AnimatedLink
                  className="milestone-link"
                  href={`/portfolio#work=${encodeURIComponent(milestone.id)}`}
                  transitionDirection="forward"
                >
                  查看项目详情
                  <AppIcon icon={ArrowRight} size="xs" />
                </AnimatedLink>
              </div>
            </section>
          )}

          <ContactSection profile={profile} />
        </main>
      </ViewTransition>
      <Footer />
    </>
  );
}
