import './globals.css';

export const metadata = {
  title: 'The Apathy Coalition Control Tower',
  description: 'Read-only operational dashboard for The Apathy Coalition',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
