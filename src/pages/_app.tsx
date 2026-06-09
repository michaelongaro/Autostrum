import { ClerkProvider } from "@clerk/nextjs";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import NextProgress from "next-progress";
import ClientErrorBoundary from "~/components/errors/ClientErrorBoundary";
import GeneralLayout from "~/components/Layout/GeneralLayout";
import "~/styles/globals.css";
import "overlayscrollbars/overlayscrollbars.css";
import { useTabStore } from "~/stores/TabStore";
import { COLOR_HEX_VALUES } from "~/utils/updateCSSThemeVars";
import { dark } from "@clerk/themes";

// might in some way mess with t3 bootstrapping, be wary
type ComponentWithPageLayout = AppProps & {
  Component: AppProps["Component"] & {
    PageLayout?: React.ComponentType;
  };
};

function App({ Component, pageProps }: ComponentWithPageLayout) {
  const { asPath } = useRouter();
  const { color, theme } = useTabStore((state) => ({
    color: state.color,
    theme: state.theme,
  }));

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: theme === "dark" ? dark : undefined,
      }}
      {...pageProps}
    >
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
    </ClerkProvider>
  );
}

export default api.withTRPC(App);
