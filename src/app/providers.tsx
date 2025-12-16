"use client"

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import config from "@/rainbowKitConfig";
import "@rainbow-me/rainbowkit/styles.css"

export function Providers(props: {children: React.ReactNode}) {
  const [queryClient] = useState(() => new QueryClient())

  return <>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {props.children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </>
}