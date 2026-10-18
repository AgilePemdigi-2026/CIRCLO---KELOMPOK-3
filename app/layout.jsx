import "./globals.css";

export const metadata = {
  title: "CIRCLO",
  description: "Platform Ekonomi Sirkular CIRCLO",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}