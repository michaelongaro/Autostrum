import { motion } from "framer-motion";
import Head from "next/head";

function Privacy() {
  return (
    <motion.div
      key={"privacy"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full px-4"
    >
      <Head>
        <title>Privacy | Autostrum</title>
        <meta name="description" content="Our privacy policy at Autostrum." />
        <meta property="og:title" content="Privacy | Autostrum"></meta>
        <meta property="og:url" content="https://www.autostrum.com/privacy" />
        <meta
          property="og:description"
          content="Our privacy policy at Autostrum."
        />
        <meta property="og:site_name" content="Autostrum" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>
      <div className="baseVertFlex z-10 my-24 items-start gap-4 rounded-xl border bg-background p-4 shadow-lg sm:w-auto sm:max-w-4xl md:p-8">
        <div className="baseVertFlex !items-start gap-2 md:!items-center">
          <h1 className="text-2xl font-bold md:text-3xl">
            Privacy Policy for Autostrum
          </h1>
          <p className="text-foreground/70">Last updated - January 4th, 2026</p>
        </div>

        <div className="baseVertFlex mt-4 w-full !items-start gap-8">
          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              Introduction
            </p>
            <p>
              Welcome to Autostrum. This Privacy Policy outlines how we collect,
              use, and handle your information when you use our services.
            </p>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              Information We Collect
            </p>
            <ol className="ml-8 list-disc md:ml-12">
              <li>
                <div className="baseFlex flex-wrap !justify-start gap-2">
                  <p className="font-semibold">Email Address:</p>
                  Used for identification and communication.
                </div>
              </li>
              <li>
                <div className="baseFlex mt-2 flex-wrap !justify-start gap-2">
                  <p className="font-semibold">Name:</p>
                  Used for identification and personalization.
                </div>
              </li>
              <li>
                <div className="baseFlex mt-2 flex-wrap !justify-start gap-2">
                  <p className="font-semibold">Profile Picture:</p>
                  Used for identification and to enhance user experience.
                </div>
              </li>
            </ol>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              How We Use Your Information
            </p>
            <p>Your information is used for the following purposes:</p>
            <ol className="ml-8 list-disc md:ml-12">
              <li>
                <div className="baseFlex flex-wrap !justify-start gap-2">
                  <p className="font-semibold">
                    Identification and Authentication:
                  </p>
                  To ensure you can access your account securely.
                </div>
              </li>
              <li>
                <div className="baseFlex mt-2 flex-wrap !justify-start gap-2">
                  <p className="font-semibold">User Experience:</p>
                  Your profile picture may be displayed in your user profile or
                  other areas within the Autostrum application.
                </div>
              </li>
            </ol>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              Cookies and Tracking Technologies
            </p>
            <p>
              We use cookies and similar tracking technologies to track the
              activity on our Service and hold certain information.
            </p>
            <ol className="ml-8 list-disc md:ml-12">
              <li>
                <div className="baseFlex flex-wrap !justify-start gap-2">
                  <p className="font-semibold">Essential Cookies:</p>
                  We use cookies to manage your authentication session (via
                  Clerk).
                </div>
              </li>
              <li>
                <div className="baseFlex mt-2 flex-wrap !justify-start gap-2">
                  <p className="font-semibold">Analytics:</p>
                  We use Vercel Analytics to understand how our website is used
                  and to improve user experience.
                </div>
              </li>
            </ol>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              Third-Party Service Providers
            </p>
            <p>
              We may employ third-party companies and individuals to facilitate
              our Service, to provide the Service on our behalf, or to assist us
              in analyzing how our Service is used.
            </p>
            <ol className="ml-8 list-disc md:ml-12">
              <li>
                <div className="baseFlex flex-wrap !justify-start gap-2">
                  <p className="font-semibold">Clerk:</p>
                  For authentication and user management.
                </div>
              </li>
              <li>
                <div className="baseFlex mt-2 flex-wrap !justify-start gap-2">
                  <p className="font-semibold">Vercel:</p>
                  For hosting and analytics.
                </div>
              </li>
              <li>
                <div className="baseFlex mt-2 flex-wrap !justify-start gap-2">
                  <p className="font-semibold">AWS S3:</p>
                  For storage of media files and assets.
                </div>
              </li>
            </ol>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              Data Retention and Deletion
            </p>
            <p>
              Your information is retained until you choose to delete your
              account. Deleting your account will remove your information from
              both Clerk and our database.
            </p>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              User Rights
            </p>
            <p>
              You have the right to access, update, or delete the information we
              have on you. Whenever made possible, you can access, update, or
              request deletion of your Personal Data directly within your
              account settings section. If you are unable to perform these
              actions yourself, please contact us to assist you.
            </p>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              Children&apos;s Privacy
            </p>
            <p>
              Our Service does not address anyone under the age of 13. We do not
              knowingly collect personally identifiable information from anyone
              under the age of 13. If You are a parent or guardian and You are
              aware that Your child has provided Us with Personal Data, please
              contact Us.
            </p>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              Changes to This Policy
            </p>
            <p>
              We may update this Privacy Policy. We will notify you of any
              changes by posting the new Privacy Policy on this page.
            </p>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="border-b-2 text-lg font-semibold md:text-xl">
              Contact Us
            </p>
            <div className="baseFlex flex-wrap !justify-start gap-2">
              <p>
                For any questions about this Privacy Policy, please contact us
                at:
              </p>
              <a
                href="mailto:michael.ongaro.dev@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                <p>michael.ongaro.dev@gmail.com</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Privacy;
