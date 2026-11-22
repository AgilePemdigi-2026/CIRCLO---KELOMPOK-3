import '@fontsource-variable/inter';
import '@fontsource-variable/montserrat';
import './globals.css';

export const metadata = {
  title: 'CIRCLO',
  description: 'Platform e-government pengelolaan material sirkular berbasis AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-circlo-bg font-sans text-circlo-ink">{children}</body>
    </html>
  );
}
