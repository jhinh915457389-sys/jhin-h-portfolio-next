import { ViewTransition } from 'react';
import { ContactSection } from '@/components/ContactSection';
import { Footer } from '@/components/Footer';
import { PortfolioBrowser } from '@/components/PortfolioBrowser';
import { SiteNav } from '@/components/SiteNav';
import {
  getCategories,
  getPdfPages,
  getPortfolioItems,
  getProfile,
  getProjectDetails,
} from '@/lib/portfolio';

export const metadata = {
  title: '作品集 / Portfolio - Jhin H Creative Portfolio',
};

export default function PortfolioPage() {
  const profile = getProfile();
  const items = getPortfolioItems();
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
          <section className="portfolio-hero section-shell">
            <span className="section-kicker">PORTFOLIO</span>
            <h1>作品集 / PORTFOLIO</h1>
            <p>
              作品集分为商业摄影、影视后期、平面视觉、IP 设计、影视脚本五大类目；点击卡片唤起页内详情，图片、视频、PDF 支持站内直接预览。
            </p>
          </section>
          <section className="section-shell portfolio-section">
            <PortfolioBrowser
              items={items}
              categories={categories}
              pdfPages={pdfPages}
              projectDetails={projectDetails}
            />
          </section>
          <ContactSection profile={profile} />
        </main>
      </ViewTransition>
      <Footer />
    </>
  );
}
