# COS 缩略图与多尺寸封面策略

## 目标

在不改变 COS 原始素材存储结构的前提下，让作品卡片、轮播、子项目网格优先加载小尺寸 WebP 缩略图；详情抽屉、视频播放、图片灯箱仍保留原始 URL 或本地生成封面，避免影响站内高质量预览。

## 已采用方案

使用腾讯云 COS 下载时图片处理参数派生缩略图 URL：

```text
?imageMogr2/thumbnail/{width}x/format/webp/strip/rquality/{quality}
```

项目中统一由 `lib/cosImage.js` 生成，不在组件里手写参数。

## 尺寸规则

- 项目封面 `coverSet`：`480w / 720w / 1080w / 1440w`
- 图集缩略图运行时派生：`360w / 520w / 720w`
- 图片灯箱：继续使用原图 URL，保证横图、竖图都能完整比例查看。
- PDF 页面与视频 poster：使用本地生成资源，不走 COS 图片处理。

## 数据规则

- `scripts/generatePortfolioData.mjs` 会给 COS 图片封面自动生成 `coverSet`。
- `portfolio-items.json` 只保存项目封面和子项目封面的多尺寸清单。
- 单张图集资产不写入多尺寸清单，前端按同一规则即时派生，避免 JSON 文件膨胀。

## 实测结果

以 `蔚来 NIO House / Image1184.webp` 为例：

- 原图：约 `2.16MB`
- `900w webp`：约 `99KB`
- `600w webp`：约 `59KB`

这说明卡片和移动端首屏的带宽收益明显，同时不会牺牲灯箱原图质量。

## 后续部署建议

优先继续采用 COS 实时处理方案。只有当线上访问量明显增大、COS 图片处理费用变得可感知时，再考虑离线生成 `_thumbs/` 目录并上传到 COS；目前无需增加这一步复杂度。
