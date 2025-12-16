import type { Metadata } from "next";
import "./globals.css";
import {Providers} from "./providers";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "tsender",
  description: "tsender",
};

export default function RootLayout(props: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Header/>
          {props.children}
        </Providers>
      </body>
    </html>
  );
}
