'use client';

import { flushSync } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getResponsiveImageProps, THUMBNAIL_WIDTHS } from '@/lib/cosImage';
import { AppIcon } from './Icon';
import { WorkCard } from './WorkCard';

const DRAWER_EXIT_MS = 230;
const GALLERY_EXIT_MS = 220;
const LIGHTBOX_EXIT_MS = 190;
const INITIAL_GALLERY_COUNT = 24;
const GALLERY_PAGE_SIZE = 24;

export function PortfolioBrowser({
  items,
  categories,
  pdfPages,
  projectDetails = {},
  initialItems,
  mode = 'portfolio',
}) {
  const [activeCategory, setActiveCategory] = useState('全部作品');
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [linkedSelectedId, setLinkedSelectedId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [closingDrawer, setClosingDrawer] = useState(false);
  const [closingLightbox, setClosingLightbox] = useState(false);
  const exitTimers = useRef([]);
  const lastTriggerRef = useRef(null);
  const sourceItems = initialItems ?? items;
  const visibleItems = useMemo(() => {
    if (mode === 'home') return sourceItems;
    if (activeCategory === '全部作品') return sourceItems;
    return sourceItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, mode, sourceItems]);
  const requestedItem = useMemo(() => {
    if (!linkedSelectedId) return null;
    return items.find((item) => item.id === linkedSelectedId || item.title === linkedSelectedId) ?? null;
  }, [linkedSelectedId, items]);

  const scheduleExit = useCallback((callback, duration) => {
    const timer = window.setTimeout(() => {
      exitTimers.current = exitTimers.current.filter((entry) => entry !== timer);
      callback();
    }, getMotionDuration(duration));
    exitTimers.current.push(timer);
  }, []);

  useEffect(() => {
    return () => {
      exitTimers.current.forEach((timer) => window.clearTimeout(timer));
      exitTimers.current = [];
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', Boolean(selectedItem || lightbox));
    return () => document.body.classList.remove('drawer-open');
  }, [selectedItem, lightbox]);

  useEffect(() => {
    setActiveFeaturedIndex(0);
  }, [sourceItems]);

  useEffect(() => {
    if (mode !== 'portfolio') return undefined;

    const syncLinkedItem = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      setLinkedSelectedId(params.get('work'));
    };

    syncLinkedItem();
    window.addEventListener('hashchange', syncLinkedItem);
    return () => window.removeEventListener('hashchange', syncLinkedItem);
  }, [mode]);

  useEffect(() => {
    if (!requestedItem) return;
    lastTriggerRef.current = null;
    setClosingDrawer(false);
    setActiveCategory('全部作品');
    setSelectedItem(requestedItem);
  }, [requestedItem]);

  const openLightbox = (images, index) => {
    setClosingLightbox(false);
    setLightbox({ images, index, direction: 0 });
  };
  const closeLightbox = useCallback(() => {
    if (!lightbox || closingLightbox) return;
    setClosingLightbox(true);
    scheduleExit(() => {
      setLightbox(null);
      setClosingLightbox(false);
    }, LIGHTBOX_EXIT_MS);
  }, [closingLightbox, lightbox, scheduleExit]);
  const shiftLightbox = (delta) => {
    setLightbox((current) => {
      if (!current) return current;
      const next = (current.index + delta + current.images.length) % current.images.length;
      return { ...current, index: next, direction: delta > 0 ? 1 : -1 };
    });
  };
  const withViewTransition = (update) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => flushSync(update));
      return;
    }
    update();
  };
  const openItem = (item, trigger) => {
    lastTriggerRef.current = trigger ?? document.activeElement;
    setClosingDrawer(false);
    setSelectedItem(item);
  };
  const closeItem = useCallback(() => {
    if (!selectedItem || closingDrawer) return;
    setClosingDrawer(true);
    scheduleExit(() => {
      setSelectedItem(null);
      setClosingDrawer(false);
      restoreFocus(lastTriggerRef.current);
    }, DRAWER_EXIT_MS);
  }, [closingDrawer, scheduleExit, selectedItem]);
  const selectCategory = (category) => withViewTransition(() => setActiveCategory(category));

  return (
    <>
      {mode === 'portfolio' && (
        <div className="filter-bar" aria-label="作品分类筛选">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? 'active' : ''}
              aria-pressed={activeCategory === category}
              onClick={() => selectCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {mode === 'home' && visibleItems.length > 1 ? (
        <FeaturedCarousel
          items={visibleItems}
          activeIndex={activeFeaturedIndex}
          onChange={setActiveFeaturedIndex}
          onOpen={openItem}
          activeTransitionId={selectedItem?.id}
        />
      ) : (
        <div className={mode === 'home' ? 'featured-grid' : 'portfolio-grid'}>
          {visibleItems.map((item, index) => (
            <WorkCard
              key={item.id}
              item={item}
              index={index}
              featured={mode === 'home'}
              activeTransitionId={selectedItem?.id}
              onClick={openItem}
            />
          ))}
        </div>
      )}

      {selectedItem && (
        <WorkDrawer
          item={selectedItem}
          pdfPages={pdfPages}
          projectDetails={projectDetails}
          closing={closingDrawer}
          onClose={closeItem}
          onOpenImage={openLightbox}
        />
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          direction={lightbox.direction}
          closing={closingLightbox}
          onClose={closeLightbox}
          onShift={shiftLightbox}
        />
      )}
    </>
  );
}

function FeaturedCarousel({ items, activeIndex, onChange, onOpen, activeTransitionId }) {
  const [isPaused, setIsPaused] = useState(false);
  const nextIndex = (activeIndex + 1) % items.length;
  const previousIndex = (activeIndex - 1 + items.length) % items.length;
  const shouldPause = isPaused || Boolean(activeTransitionId);
  const changeSlide = (index) => onChange(index);
  const swipeHandlers = useSwipeGesture({
    disabled: items.length < 2,
    onSwipeLeft: () => changeSlide(nextIndex),
    onSwipeRight: () => changeSlide(previousIndex),
  });

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || shouldPause || items.length < 2) return undefined;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const next = (activeIndex + 1) % items.length;
      changeSlide(next);
    }, 4800);

    return () => window.clearInterval(timer);
  }, [activeIndex, items.length, shouldPause]);

  return (
    <div
      className="featured-carousel"
      aria-label="首页精选作品自动轮播"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <div
        className="featured-carousel-main"
        onPointerDownCapture={swipeHandlers.onPointerDown}
        onPointerMoveCapture={swipeHandlers.onPointerMove}
        onPointerUpCapture={swipeHandlers.onPointerUp}
        onPointerCancelCapture={swipeHandlers.onPointerCancel}
        onTouchStartCapture={swipeHandlers.onTouchStart}
        onTouchMoveCapture={swipeHandlers.onTouchMove}
        onTouchEndCapture={swipeHandlers.onTouchEnd}
        onTouchCancelCapture={swipeHandlers.onTouchCancel}
        onClickCapture={swipeHandlers.onClickCapture}
      >
        <div
          className="featured-carousel-track"
          style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`featured-carousel-slide ${index === activeIndex ? 'active' : ''}`}
              aria-hidden={index === activeIndex ? undefined : 'true'}
            >
              <WorkCard
                item={item}
                index={index}
                featured
                activeTransitionId={activeTransitionId}
                onClick={onOpen}
                tabIndex={index === activeIndex ? 0 : -1}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="featured-carousel-arrow previous"
          onClick={() => changeSlide(previousIndex)}
          aria-label="上一件精选作品"
        >
          <AppIcon icon={ChevronLeft} size="md" />
        </button>
        <button
          type="button"
          className="featured-carousel-arrow next"
          onClick={() => changeSlide(nextIndex)}
          aria-label="下一件精选作品"
        >
          <AppIcon icon={ChevronRight} size="md" />
        </button>
      </div>
      <div className="featured-carousel-dots" aria-label="精选作品页码">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={index === activeIndex ? 'active' : ''}
            aria-label={`查看第 ${index + 1} 件精选作品：${item.title}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => changeSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}

function WorkDrawer({
  item,
  pdfPages,
  projectDetails = {},
  closing = false,
  onClose,
  onOpenImage,
}) {
  const hasSubgroups = item.subgroups?.length > 0;
  const [galleryPanel, setGalleryPanel] = useState(null);
  const [galleryClosing, setGalleryClosing] = useState(false);
  const [visibleGalleryCount, setVisibleGalleryCount] = useState(INITIAL_GALLERY_COUNT);
  const [videoPlaybackFailed, setVideoPlaybackFailed] = useState(false);
  const galleryExitTimer = useRef(null);
  const drawerRef = useFocusTrap(Boolean(item) && !closing && !galleryPanel, onClose);
  const pdfImages = pdfPages[item.id] ?? [];
  const pdfLightboxImages = useMemo(() => pdfImages.map((page, index) => ({
    ...page,
    title: `${item.title} 第 ${index + 1} 页`,
    filename: page.filename ?? `${item.title}-${index + 1}`,
  })), [item.title, pdfImages]);
  const imageAssets = collectImageAssets(item);
  const posterAsset = item.type === 'image' ? imageAssets[0] : null;
  const videoAsset = item.assets?.find((asset) => asset.kind === 'video');
  const visibleImageAssets = hasSubgroups || item.type === 'image' ? [] : imageAssets;
  const detail = projectDetails[item.id] ?? projectDetails[item.title] ?? null;
  const drawerCoverProps = getResponsiveImageProps({
    src: item.cover,
    imageSet: item.coverSet,
    sizes: '(max-width: 820px) 100vw, 72vw',
  });

  const closeGalleryPanel = useCallback(() => {
    if (!galleryPanel || galleryClosing) return;
    setGalleryClosing(true);
    galleryExitTimer.current = window.setTimeout(() => {
      galleryExitTimer.current = null;
      setGalleryPanel(null);
      setGalleryClosing(false);
    }, getMotionDuration(GALLERY_EXIT_MS));
  }, [galleryClosing, galleryPanel]);

  const openGalleryPanel = (group) => {
    if (galleryExitTimer.current) {
      window.clearTimeout(galleryExitTimer.current);
      galleryExitTimer.current = null;
    }
    setGalleryClosing(false);
    setGalleryPanel(group);
  };

  const handleVideoError = () => setVideoPlaybackFailed(true);

  useEffect(() => {
    if (galleryExitTimer.current) {
      window.clearTimeout(galleryExitTimer.current);
      galleryExitTimer.current = null;
    }
    setGalleryClosing(false);
    setGalleryPanel(null);
    setVisibleGalleryCount(INITIAL_GALLERY_COUNT);
    setVideoPlaybackFailed(false);
  }, [item.id]);

  useEffect(() => {
    return () => {
      if (galleryExitTimer.current) window.clearTimeout(galleryExitTimer.current);
    };
  }, []);

  return (
    <div
      ref={drawerRef}
      className={`drawer-layer ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} 详情`}
    >
      <button className="drawer-scrim" type="button" onClick={onClose} aria-label="关闭详情" tabIndex={-1} />
      <aside className="work-drawer">
        <div className="drawer-topbar">
          <button type="button" className="icon-button" onClick={onClose} aria-label="返回作品列表">
            <AppIcon icon={ArrowLeft} size="md" />
          </button>
          <span>{item.category}</span>
        </div>
        <div className="drawer-hero">
          <img
            {...drawerCoverProps}
            alt=""
            aria-hidden="true"
            width={item.coverWidth ?? 1080}
            height={item.coverHeight ?? 720}
            decoding="async"
            fetchPriority="high"
            style={{ viewTransitionName: `work-cover-${cssSafeId(item.id)}` }}
          />
          <div>
            <span className="drawer-type">{typeLabel(item.type)}</span>
            <h2>{item.title}</h2>
            {(detail?.positioning || item.description) && (
              <p>{detail?.positioning ?? item.description}</p>
            )}
          </div>
        </div>

        {detail && <ProjectDetailSummary detail={detail} item={item} />}

        {item.type === 'video' && videoAsset && (
          <section className="drawer-section">
            <h3>视频预览</h3>
            <video controls playsInline preload="metadata" poster={item.cover} onError={handleVideoError}>
              <source src={videoAsset.url} type="video/mp4" />
            </video>
            {videoPlaybackFailed && (
              <p className="video-playback-fallback" role="status">
                当前浏览器无法播放此视频。{' '}
                <a href={videoAsset.url} target="_blank" rel="noreferrer">在新标签打开视频</a>
              </p>
            )}
          </section>
        )}

        {item.type === 'pdf' && (
          <section className="drawer-section">
            <h3>作品阅读</h3>
            <div className="pdf-reader">
              {pdfLightboxImages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  className="pdf-page-button"
                  onClick={() => onOpenImage(pdfLightboxImages, index)}
                  aria-label={`查看 ${item.title} 第 ${index + 1} 页`}
                >
                  <img
                    src={page.url}
                    alt={`${item.title} 第 ${index + 1} 页`}
                    width={page.width ?? 1200}
                    height={page.height ?? 800}
                    loading="lazy"
                    decoding="async"
                    style={{
                      aspectRatio: `${page.width ?? 1200} / ${page.height ?? 800}`,
                      height: 'auto',
                    }}
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {posterAsset && (
          <section className="drawer-section poster-section">
            <div className="drawer-section-head">
              <h3>海报预览</h3>
              <p>按完整比例显示，点击可进入大图预览。</p>
            </div>
            <button
              type="button"
              className="poster-reader"
              onClick={() => onOpenImage(imageAssets, 0)}
              aria-label={`查看 ${posterAsset.title || posterAsset.filename} 完整海报`}
            >
              <img
                {...getResponsiveImageProps({
                  src: posterAsset.url,
                  widths: [640, 960, 1280],
                  quality: 82,
                  sizes: '(max-width: 820px) 92vw, 64vw',
                })}
                alt={posterAsset.title || posterAsset.filename}
                width={posterAsset.width ?? item.coverWidth ?? 960}
                height={posterAsset.height ?? item.coverHeight ?? 1280}
                loading="lazy"
                decoding="async"
              />
            </button>
          </section>
        )}

        {hasSubgroups && (
          <section className="drawer-section">
            <div className="drawer-section-head">
              <h3>图集</h3>
              <p>点击具体活动后，会以当前页面上方的图集弹窗打开。</p>
            </div>
            <div className="subproject-grid">
              {item.subgroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => openGalleryPanel(group)}
                  aria-label={`打开 ${group.title} 图集`}
                >
                  <img
                    {...getResponsiveImageProps({
                      src: group.cover,
                      imageSet: group.coverSet,
                      widths: THUMBNAIL_WIDTHS,
                      quality: 76,
                      sizes: '(max-width: 820px) 50vw, 24vw',
                    })}
                    alt={group.title}
                    width={group.coverWidth ?? 520}
                    height={group.coverHeight ?? 390}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="subproject-meta">
                    <strong>{group.title}</strong>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {visibleImageAssets.length > 0 && (
          <section className="drawer-section">
            <div className="drawer-section-head">
              <h3>图集预览</h3>
              <p>点击后可完整比例查看并左右切换。</p>
            </div>
            <div className="drawer-gallery">
              {visibleImageAssets.slice(0, visibleGalleryCount).map((asset, index) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onOpenImage(visibleImageAssets, index)}
                  aria-label={`查看 ${asset.title || asset.filename}`}
                >
                  <img
                    {...getResponsiveImageProps({
                      src: asset.url,
                      widths: THUMBNAIL_WIDTHS,
                      quality: 76,
                      sizes: '(max-width: 820px) 50vw, 22vw',
                    })}
                    alt={asset.title || asset.filename}
                    width={asset.width ?? 520}
                    height={asset.height ?? 390}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
            {visibleImageAssets.length > visibleGalleryCount && (
              <button
                type="button"
                className="gallery-load-more"
                onClick={() => setVisibleGalleryCount((count) => count + GALLERY_PAGE_SIZE)}
              >
                加载更多图片
                <span>{Math.min(visibleGalleryCount, visibleImageAssets.length)} / {visibleImageAssets.length}</span>
              </button>
            )}
          </section>
        )}
      </aside>

      {galleryPanel && (
        <SubprojectGalleryPanel
          group={galleryPanel}
          closing={galleryClosing}
          onClose={closeGalleryPanel}
          onOpenImage={onOpenImage}
        />
      )}
    </div>
  );
}

function ProjectDetailSummary({ detail, item }) {
  const deliverables = Array.isArray(detail.deliverables) ? detail.deliverables : [];
  const tools = Array.isArray(detail.tools) ? detail.tools : [];
  const highlights = Array.isArray(detail.highlights) ? detail.highlights : [];

  return (
    <section className="project-detail-summary" aria-label={`${item.title} 项目详情`}>
      <div className="detail-meta-grid">
        <DetailMeta label="ROLE" title="我的角色" value={detail.role} />
        <DetailMeta label="DELIVERABLES" title="交付内容" value={deliverables.join(' / ')} />
        <DetailMeta label="TOOLS" title="使用工具" value={tools.join(' / ')} />
      </div>

      <div className="detail-content-grid">
        {highlights.length > 0 && (
          <div className="detail-block detail-highlights">
            <span>PROJECT HIGHLIGHTS</span>
            <h3>项目亮点</h3>
            <ul>
              {highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function DetailMeta({ label, title, value }) {
  if (!value) return null;
  return (
    <div className="detail-meta-card">
      <span>{label}</span>
      <strong>{title}</strong>
      <p>{value}</p>
    </div>
  );
}

function SubprojectGalleryPanel({ group, closing = false, onClose, onOpenImage }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_GALLERY_COUNT);
  const panelRef = useFocusTrap(!closing, onClose, { restoreOnDeactivate: true });
  const visibleAssets = group.assets.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(INITIAL_GALLERY_COUNT);
  }, [group.id]);

  return (
    <div
      ref={panelRef}
      className={`subgallery-layer ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${group.title} 图集`}
    >
      <button className="subgallery-scrim" type="button" onClick={onClose} aria-label="关闭图集" tabIndex={-1} />
      <section className="subgallery-panel">
        <div className="subgallery-head">
          <div>
            <span>PHOTO SET</span>
            <h3>{group.title}</h3>
            <p>点击后可完整比例查看并左右切换。</p>
          </div>
          <button type="button" className="subgallery-close" onClick={onClose} aria-label="关闭图集">
            <AppIcon icon={X} size="md" />
          </button>
        </div>
        <div className="subgallery-grid">
          {visibleAssets.map((asset, index) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onOpenImage(group.assets, index)}
              aria-label={`查看 ${asset.title || asset.filename}`}
            >
              <img
                {...getResponsiveImageProps({
                  src: asset.url,
                  widths: THUMBNAIL_WIDTHS,
                  quality: 76,
                  sizes: '(max-width: 820px) 50vw, 20vw',
                })}
                alt={asset.title || asset.filename}
                width={asset.width ?? 520}
                height={asset.height ?? 390}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
          {group.assets.length > visibleCount && (
            <button
              type="button"
              className="gallery-load-more subgallery-load-more"
              onClick={() => setVisibleCount((count) => count + GALLERY_PAGE_SIZE)}
            >
              加载更多图片
              <span>{Math.min(visibleCount, group.assets.length)} / {group.assets.length}</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ImageLightbox({ images, index, direction = 0, closing = false, onClose, onShift }) {
  const current = images[index];
  const directionClass = direction > 0 ? 'is-next' : direction < 0 ? 'is-previous' : '';
  const lightboxRef = useFocusTrap(!closing, onClose, { restoreOnDeactivate: true });
  const swipeHandlers = useSwipeGesture({
    disabled: images.length < 2 || closing,
    onSwipeLeft: () => onShift(1),
    onSwipeRight: () => onShift(-1),
  });
  const onLightboxKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onShift(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onShift(1);
    }
  };

  return (
    <div
      ref={lightboxRef}
      className={`lightbox ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onKeyDown={onLightboxKeyDown}
      onPointerDownCapture={swipeHandlers.onPointerDown}
      onPointerMoveCapture={swipeHandlers.onPointerMove}
      onPointerUpCapture={swipeHandlers.onPointerUp}
      onPointerCancelCapture={swipeHandlers.onPointerCancel}
      onTouchStartCapture={swipeHandlers.onTouchStart}
      onTouchMoveCapture={swipeHandlers.onTouchMove}
      onTouchEndCapture={swipeHandlers.onTouchEnd}
      onTouchCancelCapture={swipeHandlers.onTouchCancel}
      onClickCapture={swipeHandlers.onClickCapture}
    >
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="关闭图片预览">
        <AppIcon icon={X} size="md" />
      </button>
      <button type="button" className="lightbox-arrow left" onClick={() => onShift(-1)} aria-label="上一张">
        <AppIcon icon={ChevronLeft} size="lg" />
      </button>
      <img
        key={current.id || current.url}
        className={`lightbox-image ${directionClass}`}
        src={current.url}
        alt={current.title || current.filename || '作品图片'}
        width={current.width ?? 1600}
        height={current.height ?? 1200}
        decoding="async"
      />
      <button type="button" className="lightbox-arrow right" onClick={() => onShift(1)} aria-label="下一张">
        <AppIcon icon={ChevronRight} size="lg" />
      </button>
      <div className="lightbox-count">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}

function useSwipeGesture({ disabled = false, onSwipeLeft, onSwipeRight }) {
  const gestureRef = useRef(null);
  const suppressClickUntilRef = useRef(0);

  const resetGesture = useCallback(() => {
    gestureRef.current = null;
  }, []);

  const startGesture = useCallback((point, target, pointerId = 'touch') => {
    if (disabled || Date.now() < suppressClickUntilRef.current) return;
    gestureRef.current = {
      pointerId,
      startX: point.clientX,
      startY: point.clientY,
      target,
    };
  }, [disabled]);

  const moveGesture = useCallback((point, pointerId, event, canPreventDefault = true) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerId) return;

    const deltaX = point.clientX - gesture.startX;
    const deltaY = point.clientY - gesture.startY;
    if (canPreventDefault && Math.abs(deltaX) > 16 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
      event.preventDefault();
    }
  }, []);

  const endGesture = useCallback((point, pointerId) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerId) return false;

    const deltaX = point.clientX - gesture.startX;
    const deltaY = point.clientY - gesture.startY;
    const isHorizontalSwipe = Math.abs(deltaX) >= 46 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;

    if (typeof pointerId === 'number') {
      try {
        gesture.target.releasePointerCapture?.(pointerId);
      } catch {
        // Ignore release failures for non-captured pointer streams.
      }
    }
    resetGesture();

    if (!isHorizontalSwipe) return false;
    suppressClickUntilRef.current = Date.now() + 350;
    if (deltaX < 0) onSwipeLeft?.();
    else onSwipeRight?.();
    return true;
  }, [onSwipeLeft, onSwipeRight, resetGesture]);

  const onPointerDown = useCallback((event) => {
    if (disabled || event.pointerType === 'mouse' || event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic and some older mobile events can fail pointer capture; swipe detection still works without it.
    }
    startGesture(event, event.currentTarget, event.pointerId);
  }, [disabled, startGesture]);

  const onPointerMove = useCallback((event) => {
    moveGesture(event, event.pointerId, event);
  }, [moveGesture]);

  const onPointerUp = useCallback((event) => {
    endGesture(event, event.pointerId);
  }, [endGesture]);

  const onTouchStart = useCallback((event) => {
    if (event.touches.length !== 1) return;
    startGesture(event.touches[0], event.currentTarget);
  }, [startGesture]);

  const onTouchMove = useCallback((event) => {
    if (event.touches.length !== 1) return;
    moveGesture(event.touches[0], 'touch', event, false);
  }, [moveGesture]);

  const onTouchEnd = useCallback((event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    endGesture(touch, 'touch');
  }, [endGesture]);

  const onClickCapture = useCallback((event) => {
    if (Date.now() > suppressClickUntilRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const onPointerCancel = useCallback((event) => {
    const gesture = gestureRef.current;
    if (gesture?.pointerId === event.pointerId) {
      try {
        gesture.target.releasePointerCapture?.(event.pointerId);
      } catch {
        // Ignore release failures for non-captured pointer streams.
      }
    }
    resetGesture();
  }, [resetGesture]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: resetGesture,
    onClickCapture,
  };
}

function collectImageAssets(item) {
  if (item.type !== 'gallery' && item.type !== 'image') return [];
  return item.assets?.filter((asset) => asset.kind === 'image') ?? [];
}

function typeLabel(type) {
  if (type === 'video') return 'VIDEO';
  if (type === 'pdf') return 'PDF READER';
  if (type === 'image') return 'POSTER';
  return 'GALLERY';
}

function cssSafeId(id) {
  const base = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  return `${base}-${hashString(id)}`;
}

function getMotionDuration(duration) {
  if (typeof window === 'undefined') return duration;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : duration;
}

function useFocusTrap(active, onEscape, options = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return undefined;
    const container = containerRef.current;
    const previousActive = document.activeElement;
    const focusable = getFocusableElements(container);
    const target = focusable[0] ?? container;
    window.requestAnimationFrame(() => target.focus({ preventScroll: true }));

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const elements = getFocusableElements(container);
      if (!elements.length) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      if (options.restoreOnDeactivate) restoreFocus(previousActive);
    };
  }, [active, onEscape, options.restoreOnDeactivate]);

  return containerRef;
}

function getFocusableElements(container) {
  return [...container.querySelectorAll(
    'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
  )].filter((element) => {
    const style = window.getComputedStyle(element);
    return (
      element.tabIndex >= 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && element.getClientRects().length > 0
    );
  });
}

function restoreFocus(element) {
  if (element && typeof element.focus === 'function' && document.contains(element)) {
    element.focus({ preventScroll: true });
  }
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
