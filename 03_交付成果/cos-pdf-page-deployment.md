# PDF 页图片 COS 部署策略

当前站内 PDF 阅读依赖 `public/assets/pdf-pages/` 中的页面图片，优点是本地预览稳定，缺点是应用包体会增加约 132MB。

## 推荐上线策略

1. 保留当前本地版本用于开发和兜底。
2. 运行 `pnpm generate:pdf-cos-manifest` 生成上传清单：
   - 输出：`03_交付成果/pdf-pages-cos-upload-manifest.json`
   - 每一项包含本地路径、COS 目标 key、公开 URL、图片宽高。
3. 用 COSCLI 批量上传 `public/assets/pdf-pages/`。
4. 确认 COS 公开访问正常后，把 `public/data/pdf-pages.json` 中的本地 URL 替换为清单里的 `publicUrl`。
5. 远程 URL 验证通过后，再考虑从部署包中移除本地 PDF 页图片。

## 取舍

- 本地打包：最稳，但部署包更大。
- COS 远程读取：部署包更轻，国内访问更适合，但依赖 COS 可用性和 CDN 缓存。
- 不建议恢复浏览器直接打开 PDF，因为部分环境会触发下载，违背站内预览目标。
