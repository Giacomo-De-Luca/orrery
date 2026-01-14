"use client";

import { ApolloProvider } from '@apollo/client/react';
import { ThemeProvider } from '@/lib/utils/theme-provider';
import { apolloClient } from '@/lib/utils/apollo-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </ApolloProvider>
  );
}
