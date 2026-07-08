import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
