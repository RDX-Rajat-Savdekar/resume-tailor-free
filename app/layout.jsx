
import "./globals.css";

export const metadata = {
  title: "Resume Tailor (Free)",
  description: "ATS keyword coverage & suggestions — 100% free MVP",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
