import { ClerkProvider } from "@clerk/nextjs";
import type { AppProps } from "next/app";
import { api } from "~/utils/api";
import NextProgress from "next-progress";
import GeneralLayout from "~/components/Layout/GeneralLayout";
import "~/styles/globals.css";
import "overlayscrollbars/overlayscrollbars.css";

// might in some way mess with t3 bootstrapping, be wary
type ComponentWithPageLayout = AppProps & {
  Component: AppProps["Component"] & {
    PageLayout?: React.ComponentType;
  };
};

function App({ Component, pageProps }: ComponentWithPageLayout) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "rgb(236, 72, 153)",
          colorInputBackground: "rgb(252, 232, 244)",
          colorTextSecondary: "rgb(129, 24, 66)",
          fontFamily: "'Noto Sans', sans-serif",
          borderRadius: "0.375rem",
          colorDanger: "rgb(220, 38, 38)",
          colorSuccess: "rgb(22, 163, 74)",
          colorInputText: "rgb(157, 23, 77)",
          colorBackground: "rgb(252, 232, 244)",
          colorText: "rgb(157, 23, 77)",
          colorAlphaShade: "rgb(131, 24, 67)",
        },
      }}
      {...pageProps}
    >
      <NextProgress
        color={"#be185d"}
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
