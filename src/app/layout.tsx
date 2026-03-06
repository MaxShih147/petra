import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PETRA — The Fossil Atlas",
  description:
    "An interactive, scholarly-styled web atlas visualizing dinosaur fossil discoveries across the globe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>{children}</body>
    </html>
  );
}
