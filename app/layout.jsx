import './globals.css';
import { withBasePath } from '@/lib/sitePath';

export const metadata = {
  title: 'Jhin H Creative Portfolio',
  description: '黄忠杰 Jhin H 的个人视觉作品集',
};

export const viewport = {
  themeColor: '#0d0b00',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <style
          dangerouslySetInnerHTML={{
            __html: `
@font-face {
  font-family: 'InterLocal';
  src: url('${withBasePath('/assets/fonts/inter-400.woff2')}') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'InterLocal';
  src: url('${withBasePath('/assets/fonts/inter-600.woff2')}') format('woff2');
  font-weight: 600;
  font-display: swap;
}
@font-face {
  font-family: 'SpaceMonoLocal';
  src: url('${withBasePath('/assets/fonts/space-mono-700.woff2')}') format('woff2');
  font-weight: 700;
  font-display: swap;
}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
