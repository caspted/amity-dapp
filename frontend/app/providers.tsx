"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { ApolloProvider } from "@apollo/client/react";
import { wagmiConfig } from "@/lib/wagmi";
import { apolloClient } from "@/lib/apollo";
import { useState } from "react";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { useMounted } from "@/hooks/use-mounted";

import "@rainbow-me/rainbowkit/styles.css";

function RainbowKitWithTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const rkTheme = mounted && resolvedTheme === "dark" ? darkTheme() : lightTheme();

  return (
    <RainbowKitProvider theme={rkTheme} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ApolloProvider client={apolloClient}>
            <RainbowKitWithTheme>{children}</RainbowKitWithTheme>
          </ApolloProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
