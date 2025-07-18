import { ClerkProvider } from "@clerk/nextjs";
import type { AppProps } from "next/app";
import { api } from "~/utils/api";
import NextProgress from "next-progress";
import GeneralLayout from "~/components/Layout/GeneralLayout";
import "~/styles/globals.css";
import "overlayscrollbars/overlayscrollbars.css";
import { useTabStore } from "~/stores/TabStore";
import { HEX_COLOR_VALUES } from "~/utils/updateCSSThemeVars";
import { dark } from "@clerk/themes";

// might in some way mess with t3 bootstrapping, be wary
type ComponentWithPageLayout = AppProps & {
  Component: AppProps["Component"] & {
    PageLayout?: React.ComponentType;
  };
};

function App({ Component, pageProps }: ComponentWithPageLayout) {
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
        color={HEX_COLOR_VALUES[color]}
        height={4}
        delay={300}
        disableSameRoute
        options={{ showSpinner: false }}
      />
      <GeneralLayout>
        <Component {...pageProps} />
      </GeneralLayout>
    </ClerkProvider>
  );
}

export default api.withTRPC(App);
