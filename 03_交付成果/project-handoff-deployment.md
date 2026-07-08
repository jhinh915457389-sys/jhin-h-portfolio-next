# Jhin H Creative Portfolio Next 版交接与部署说明

更新时间：2026-07-09

## 当前状态

- 项目类型：Next.js App Router 静态作品集网站。
- 正式路由：`/`、`/portfolio`、`/icon.svg`。
- 本地预览：`http://127.0.0.1:4174/`。
- 主要能力：作品分类筛选、首页精选轮播、项目详情抽屉、商业摄影图集弹窗、图片灯箱、PDF 站内阅读、视频播放、联系方式复制。

## 本地运行

```bash
pnpm install
pnpm dev --hostname 127.0.0.1 --port 4174
```

## 发布前检查

```bash
pnpm test
pnpm build
pnpm visual:check
```

当前最近一次验证结果：

- `pnpm test` 通过。
- `pnpm build` 通过，`/portfolio` 保持静态页面。
- `pnpm visual:check` 通过。

## 打包策略

交付压缩包为可运行源码包，保留：

- `app/`
- `components/`
- `lib/`
- `public/`
- `scripts/`
- `package.json`
- `pnpm-lock.yaml`
- 项目说明、需求、过程、复盘与交付文档
- `04_素材与参考/` 下根层素材文件

默认排除：

- `node_modules/`
- `.next/`
- `tmp/`
- `04_素材与参考/backups/`
- `04_素材与参考/reference/`
- `03_交付成果/previews/`
- 已生成的 `.zip` 包
- 编辑器临时文件

## GitHub 备份建议

建议上传 GitHub 做备份，但建议使用私有仓库。

推荐做法：

1. 新建 private repository。
2. 提交源码、`public/` 资源、数据 JSON、脚本和文档。
3. 不提交 `node_modules/`、`.next/`、`tmp/`、历史备份和预览截图。
4. 若后续部署到 Vercel，可直接连接 GitHub 仓库。

GitHub 的价值主要是版本回滚、异地备份和部署集成；它不是国内访问加速方案。

## 国内访问部署建议

本项目可以静态构建，适合对象存储 + CDN。

### 推荐路线 A：腾讯云 COS + CDN

适合你当前素材已经在腾讯云 COS 的情况。

建议流程：

1. 准备域名。
2. 做 ICP 备案。
3. 执行静态构建。
4. 将构建输出上传至腾讯云 COS 静态网站桶。
5. 绑定自定义域名。
6. 接入腾讯云 CDN。
7. 开启 HTTPS。

优点：国内访问稳定，和现有 COS 素材同生态，后续资源迁移成本低。

注意：如果使用中国大陆节点或面向大陆提供服务，通常需要完成 ICP 备案。

### 备选路线 B：阿里云 OSS + CDN

同样适合国内访问，但你的素材链路当前在腾讯云，迁移成本略高。

### 备选路线 C：Vercel / Netlify / Cloudflare Pages

适合快速海外预览，不适合作为国内访问优先的最终方案。

原因：

- 国内访问存在延迟、波动或不可控风险。
- Vercel 官方说明其没有中国大陆服务器或 CDN 节点。
- 若目标用户主要在国内，仍建议走国内云厂商 + 备案 + CDN。

## 下一步建议

1. 先上传 GitHub private repo 做代码备份。
2. 同时准备域名和 ICP 备案。
3. 备案完成后，优先部署到腾讯云 COS + CDN。
4. 如果短期只需要给少量人看，可以先用 Vercel 做临时预览，但不要把它当国内稳定最终方案。
