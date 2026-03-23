export const metadata = {
  title: "Patrimoine",
  description: "Suivi patrimoine personnel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: "#080808" }}>
        {children}
      </body>
    </html>
  );
}
