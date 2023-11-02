import { ClerkProvider } from "@clerk/nextjs";
import type { AppProps } from "next/app";
import { api } from "~/utils/api";
import NextProgress from "next-progress";
import GeneralLayout from "~/components/Layouts/GeneralLayout";
import "~/styles/globals.css";

// might in some way mess with t3 bootstrapping, be wary
type ComponentWithPageLayout = AppProps & {
  Component: AppProps["Component"] & {
    PageLayout?: React.ComponentType;
  };
};

function MyApp({ Component, pageProps }: ComponentWithPageLayout) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "rgb(236, 72, 153)",
          colorInputBackground: "rgb(253, 242, 248)",
          colorTextSecondary: "rgb(219, 39, 119)",
          fontFamily: "'Noto Sans', sans-serif",
          borderRadius: "0.375rem",
          colorDanger: "rgb(220, 38, 38)",
          colorSuccess: "rgb(22, 163, 74)",
          colorInputText: "rgb(157, 23, 77)",
          colorBackground: "rgb(253, 242, 248)",
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
        {Component.PageLayout ? (
          <Component.PageLayout>
            <Component {...pageProps} />
          </Component.PageLayout>
        ) : (
          <Component {...pageProps} />
        )}
      </GeneralLayout>
    </ClerkProvider>
  );
}

export default api.withTRPC(MyApp);
