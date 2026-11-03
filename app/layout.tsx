import type { Metadata } from "next";
import "@fontsource-variable/alegreya";
import "@fontsource-variable/onest";
import "./globals.css";

export const metadata: Metadata = {
  title: "Оферта за озеленяване | ЗеленоВкъщи",
  description:
    "Изчислете ориентировъчна цена за поддръжка на двор, озеленяване и грижа за растенията. Получавате оферта за минута.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bg" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
