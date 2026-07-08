import { Play, FileText, Images, Image as ImageIcon } from 'lucide-react';
import { AppIcon } from './Icon';
import { getResponsiveImageProps } from '@/lib/cosImage';

const iconMap = {
  video: Play,
  pdf: FileText,
  gallery: Images,
  image: ImageIcon,
};

export function WorkCard({
  item,
  index = 0,
  onClick,
  featured = false,
  activeTransitionId = '',
  tabIndex,
}) {
  const Icon = iconMap[item.type] ?? Images;
  const tone = workCardTone(item);
  const transitionName =
    item.id === activeTransitionId ? 'none' : `work-cover-${cssSafeId(item.id)}`;
  const priorityImage = featured ? index === 0 : index < 4;
  const imageProps = getResponsiveImageProps({
    src: item.cover,
    imageSet: item.coverSet,
    sizes: featured ? '100vw' : '(max-width: 820px) 50vw, (max-width: 1100px) 33vw, 25vw',
  });
  return (
    <button
      type="button"
      className={`work-card ${featured ? 'featured-card' : ''} ${tone}`}
      onClick={(event) => onClick?.(item, event.currentTarget)}
      tabIndex={tabIndex}
    >
      <span className="work-media">
        <img
          {...imageProps}
          alt={item.title}
          width={item.coverWidth ?? 720}
          height={item.coverHeight ?? 540}
          loading={priorityImage ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priorityImage ? 'high' : 'low'}
          style={{ viewTransitionName: transitionName }}
        />
      </span>
      {item.type === 'video' && (
        <span className="work-play-mark" aria-hidden="true">
          <AppIcon icon={Play} size="sm" fill="currentColor" />
        </span>
      )}
      {(item.type === 'pdf' || item.type === 'image') && <span className="work-paper-edge" />}
      <span className="work-meta">
        <span className="work-category">
          <AppIcon icon={Icon} size="xs" />
          {item.category}
        </span>
        <span className="work-title">{item.title}</span>
      </span>
    </button>
  );
}

function workCardTone(item) {
  if (item.category === '商业摄影') return 'work-card-photo';
  if (item.type === 'video') return 'work-card-video';
  if (item.type === 'pdf' || item.type === 'image') return 'work-card-document';
  return 'work-card-media';
}

function cssSafeId(id) {
  const base = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  return `${base}-${hashString(id)}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
