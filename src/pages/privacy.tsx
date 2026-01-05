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
      className="baseVertFlex w-full"
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
      <div className="baseVertFlex z-10 my-24 gap-16">
        <div className="baseVertFlex baseVertFlex w-5/6 items-start gap-4 rounded-xl border bg-background p-4 shadow-lg sm:w-auto md:p-8">
          <div className="baseVertFlex !items-start gap-2 md:!items-center">
            <h1 className="text-2xl font-bold md:text-3xl">
              Privacy Policy for Autostrum
            </h1>
            <p className="text-foreground/70">Last updated - July 16th, 2025</p>
          </div>

          <div className="baseVertFlex mt-4 w-full !items-start gap-8">
            <div className="baseVertFlex !items-start gap-2">
              <p className="border-b-2 text-lg font-semibold md:text-xl">
                Introduction
              </p>
              <p>
                Welcome to Autostrum. This Privacy Policy outlines how we
                collect, use, and handle your information when you use our
                services.
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
                    Your profile picture may be displayed in your user profile
                    or other areas within the Autostrum application.
                  </div>
                </li>
              </ol>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <p className="border-b-2 text-lg font-semibold md:text-xl">
                Data Storage and Security
              </p>
              <p>
                We share your data with Clerk, an external service that manages
                our authentication process.
              </p>
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
      </div>
    </motion.div>
  );
}

export default Privacy;
