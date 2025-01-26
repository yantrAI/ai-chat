import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModelsProvider } from "@/context/models-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Chat Hub",
  description: "Chat with various open-source AI models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased
          bg-background relative
          before:fixed before:inset-0
          before:bg-[repeating-linear-gradient(45deg,rgb(51,65,85)_0px,rgb(51,65,85)_1px,transparent_1px,transparent_40px)]
          before:opacity-30
          before:-z-10`}
      >
        <ModelsProvider>{children}</ModelsProvider>
      </body>
    </html>
  );
}
