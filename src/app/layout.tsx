import '../styles/globals.css';
import '../styles/analytics-fixes.css'; // Importation des correctifs pour les graphiques
// ...existing imports...

export const metadata = {
  // ...existing metadata...
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
