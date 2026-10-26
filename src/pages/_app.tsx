import { ClerkProvider, useAuth } from "@clerk/nextjs";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import NextProgress from "next-progress";
import ClientErrorBoundary from "~/components/errors/ClientErrorBoundary";
import GeneralLayout from "~/components/Layout/GeneralLayout";
import SEO from "~/components/SEO";
import "~/styles/globals.css";
import "overlayscrollbars/overlayscrollbars.css";
import { useTabStore } from "~/stores/TabStore";
import { COLOR_HEX_VALUES } from "~/utils/updateCSSThemeVars";
import { dark } from "@clerk/ui/themes";

// might in some way mess with t3 bootstrapping, be wary
type ComponentWithPageLayout = AppProps & {
  Component: AppProps["Component"] & {
    PageLayout?: React.ComponentType;
  };
};

function App({ Component, pageProps }: ComponentWithPageLayout) {
  const { asPath } = useRouter();
  const color = useTabStore((state) => state.color);

  return (
    <>
      <SEO />
      <NextProgress
        key={color}
        color={COLOR_HEX_VALUES[color]}
        height={4}
        delay={300}
        disableSameRoute
        options={{ showSpinner: false }}
      />
      <GeneralLayout>
        <ClientErrorBoundary resetKey={asPath}>
          <Component {...pageProps} />
        </ClientErrorBoundary>
      </GeneralLayout>
    </>
  );
}

const AppWithTRPC = api.withTRPC(App);

function SessionApp(props: ComponentWithPageLayout) {
  const { userId } = useAuth();
  // A new provider gets a fresh QueryClient whenever the account changes.
  return <AppWithTRPC key={userId ?? "guest"} {...props} />;
}

export default function AppProviders(props: ComponentWithPageLayout) {
  const theme = useTabStore((state) => state.theme);
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        theme: theme === "dark" ? dark : undefined,
        options: { showOptionalFields: true },
      }}
      {...props.pageProps}
    >
      <SessionApp {...props} />
    </ClerkProvider>
  );
}
