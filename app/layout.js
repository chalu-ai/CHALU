import "./globals.css";

export const metadata = {
  title: "CHALU — Premium AI",
  description: "CHALU is a premium AI assistant powered by Gemini."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
