# Design

## Theme

深色高级影像官网。首页以 Relume 导出的山路影像作为首屏视觉锚点，整体使用暗橄榄黑、雾面玻璃、白色大标题与少量金色提示形成摄影与科技混合的气质。

## Color Tokens

- Background: `#0d0b00`
- Raised background: `#18160e`
- Soft section background: `#252319`
- Text: `#fffdf4`
- Muted text: `#c8c4b7`
- Dim text: `#86857f`
- Border: `rgba(255, 255, 255, 0.18)`
- Gold accent: `#ffd700`
- Violet atmosphere: `#8e2de2`

## Typography

- Display: `SpaceMonoLocal`，用于 hero title、section title 和 portfolio title。
- Body: `InterLocal`，用于正文、导航和 metadata。
- 内容以中文为主，关键英文如 `PORTFOLIO`、`CONTACT`、`VIDEO` 作为功能标记。

## Layout

- Homepage: fixed glass navigation, image-led hero, core skills band, six selected works, milestone project, contact section and footer.
- Portfolio page: title area, sticky horizontal category filter, left-to-right card grid on desktop, two-column compact card grid on mobile.
- Detail preview: desktop uses a right drawer at about 72% viewport width; mobile uses full-height bottom drawer.
- Featured works: six cards use a regular 3 by 2 grid on desktop to avoid false “broken masonry” perception.
- Commercial photography hierarchy: total project card opens a drawer; projects with subfolders show a subproject grid before the image gallery.

## Components

- `SiteNav`: camera icon plus brand lockup, no resume/about link.
- `WorkCard`: image-led card with category and title overlay.
- `PortfolioBrowser`: category filtering, drawer detail and lightbox state.
- `WorkDrawer`: gallery grid, subproject grid, video player, PDF page reader and lightbox entry.
- `ContactSection`: phone, email, WeChat ID with explicit per-row copy controls and QR code.

## Motion

Motion remains restrained: page focus blur-to-clear, card hover lift, drawer transition and lightbox switching. Reduced motion is respected in CSS.

## Accessibility Notes

Interactive controls use real buttons or links, focus-visible styling is defined, modal surfaces use dialog roles, and mobile horizontal overflow is checked by the visual script.
