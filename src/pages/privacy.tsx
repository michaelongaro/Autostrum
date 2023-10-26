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
        <meta property="og:url" content="www.autostrum.com/privacy" />
        <meta
          property="og:description"
          content="Our privacy policy at Autostrum."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>
      <div className="baseVertFlex z-10 my-24 !flex-nowrap gap-16">
        <div className="baseVertFlex lightGlassmorphic baseVertFlex w-5/6 items-start gap-4 rounded-xl p-4 shadow-sm sm:w-auto md:p-8">
          <h1 className="text-3xl font-bold">Privacy Policy for Autostrum</h1>
          <p>Last updated - September 25th, 2023</p>

          <div className="baseVertFlex w-full !items-start gap-8">
            <div className="baseVertFlex !items-start gap-2">
              <h2 className="border-b-2 text-xl font-semibold ">
                Introduction
              </h2>
              <p className="text-pink-100">
                Welcome to Autostrum. This Privacy Policy outlines how we
                collect, use, and handle your information when you use our
                services.
              </p>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <h2 className="border-b-2 text-xl font-semibold">
                Information We Collect
              </h2>
              <ol className="ml-8 list-disc text-pink-100 md:ml-12">
                <li>
                  <div className="baseFlex !justify-start gap-2">
                    <p className="font-semibold">Email Address:</p>
                    Used for identification and communication.
                  </div>
                </li>
                <li>
                  <div className="baseFlex !justify-start gap-2">
                    <p className="font-semibold">Name:</p>
                    Used for identification and personalization.
                  </div>
                </li>
                <li>
                  <div className="baseFlex !justify-start gap-2">
                    <p className="font-semibold">Profile Picture:</p>
                    Used for identification and to enhance user experience.
                  </div>
                </li>
              </ol>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <h2 className="border-b-2 text-xl font-semibold ">
                How We Use Your Information
              </h2>
              <p className="text-pink-100">
                Your information is used for the following purposes:
              </p>
              <ol className="ml-8 list-disc text-pink-100 md:ml-12">
                <li>
                  <div className="baseFlex !justify-start gap-2">
                    <p className="font-semibold">
                      Identification and Authentication:
                    </p>
                    To ensure you can access your account securely.
                  </div>
                </li>
                <li>
                  <div className="baseFlex !justify-start gap-2">
                    <p className="font-semibold">User Experience:</p>
                    Your profile picture may be displayed in your user profile
                    or other areas within the Autostrum application.
                  </div>
                </li>
              </ol>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <h2 className="border-b-2 text-xl font-semibold ">
                Data Storage and Security
              </h2>
              <p className="text-pink-100">
                We share your data with Clerk, an external service that manages
                our authentication process.
              </p>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <h2 className="border-b-2 text-xl font-semibold ">
                Data Retention and Deletion
              </h2>
              <p className="text-pink-100">
                Your information is retained until you choose to delete your
                account. Deleting your account will remove your information from
                both Clerk and our database.
              </p>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <h2 className="border-b-2 text-xl font-semibold ">
                Changes to This Policy
              </h2>
              <p className="text-pink-100">
                We may update this Privacy Policy. We will notify you of any
                changes by posting the new Privacy Policy on this page.
              </p>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <h2 className="border-b-2 text-xl font-semibold ">Contact Us</h2>
              <div className="baseFlex gap-2">
                <p className="text-pink-100">
                  For any questions about this Privacy Policy, please contact us
                  at:
                </p>
                <a
                  href="mailto:michael.ongaro.dev@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="baseFlex gap-2 underline"
                >
                  <p className="text-pink-100">michael.ongaro.dev@gmail.com</p>
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
