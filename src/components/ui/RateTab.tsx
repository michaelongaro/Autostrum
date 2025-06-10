import { AnimatePresence, motion } from "framer-motion";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
} from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
import type { UserMetadata } from "~/server/api/routers/user";
import { api } from "~/utils/api";
import { formatNumber } from "~/utils/formatNumber";
import { Button } from "./button";
import { FaRegStar, FaStar } from "react-icons/fa6";
import { useTabStore } from "~/stores/TabStore";
import { SignInButton } from "@clerk/nextjs";
import { FaUser } from "react-icons/fa";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 1,
    scale: 1,
  },
};

const ratingTitles = ["Poor", "Basic", "Fair", "Great", "Excellent"];

const ratingDescriptions = [
  "Significantly inaccurate or incomplete, needs a major overhaul.",
  "Some useful parts, but contains noticeable errors or missing details.",
  "Decent accuracy and structure, yet still has room for improvement.",
  "Well-detailed and mostly accurate, with only minor issues.",
  "Flawless transcription that's comprehensive and easy to follow.",
];

interface RateTab {
  tabId: number;
  averageRating: number;
  ratingsCount: number;
  currentUser: UserMetadata | null | undefined;
  userRating: number | null;
  tabCreatorUserId?: string;
  customClassName: string;
}

function RateTab({
  tabId,
  averageRating,
  ratingsCount,
  currentUser,
  userRating,
  tabCreatorUserId,
  customClassName,
}: RateTab) {
  const { viewportLabel, setMobileHeaderModal } = useTabStore((state) => ({
    viewportLabel: state.viewportLabel,
    setMobileHeaderModal: state.setMobileHeaderModal,
  }));

  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(
    userRating,
  );
  const [ratingSubmitted, setRatingSubmitted] = useState(
    userRating !== null ? true : false,
  );
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);

  // used just to prevent awkward hover states from immediately appearing after
  // clicking a star
  const lockOutHoveredRatingRef = useRef(false);

  const [showPopover, setShowPopover] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const ctx = api.useUtils();

  const { mutate: submitRating } = api.tabRating.rate.useMutation({
    onMutate: async () => {
      // --- optimistic UI update ---

      // declaring above so that precomputed field bookkeeping can
      // use these values as well
      let userAlreadyRated = false;
      let oldRating = 0;

      await ctx.tab.getRatingBookmarkAndViewCount.cancel();

      ctx.tab.getRatingBookmarkAndViewCount.setData(tabId, (prev) => {
        if (!prev || !selectedRating) return prev;

        userAlreadyRated = prev.userRating !== null;
        oldRating = prev.userRating ?? 0; // Use 0 if no prior rating

        let newAverageRating: number;
        let newRatingsCount: number;

        if (userAlreadyRated) {
          // User is updating their existing rating
          newAverageRating =
            (prev.averageRating * prev.ratingsCount -
              oldRating +
              selectedRating) /
            prev.ratingsCount;
          newRatingsCount = prev.ratingsCount;
        } else {
          // User is submitting a new rating
          newAverageRating =
            (prev.averageRating * prev.ratingsCount + selectedRating) /
            (prev.ratingsCount + 1);
          newRatingsCount = prev.ratingsCount + 1;
        }

        return {
          ...prev,
          userRating: selectedRating,
          averageRating: newAverageRating,
          ratingsCount: newRatingsCount,
        };
      });

      // --- precomputed fields bookkeeping ---
      if (tabCreatorUserId) {
        await ctx.user.getById.cancel(tabCreatorUserId);

        ctx.user.getById.setData(tabCreatorUserId, (prev) => {
          if (!prev || !selectedRating) return prev;

          let newAverageRating: number;
          let newRatingsCount: number;

          if (userAlreadyRated) {
            // User is updating their existing rating
            newAverageRating =
              (prev.averageTabRating * prev.totalTabRatings -
                oldRating +
                selectedRating) /
              prev.totalTabRatings;
            newRatingsCount = prev.totalTabRatings;
          } else {
            // User is submitting a new rating
            newAverageRating =
              (prev.averageTabRating * prev.totalTabRatings + selectedRating) /
              (prev.totalTabRatings + 1);
            newRatingsCount = prev.totalTabRatings + 1;
          }

          return {
            ...prev,
            averageTabRating: newAverageRating,
            totalTabRatings: newRatingsCount,
          };
        });
      }

      setRatingSubmitted(true);
      setShowThankYouMessage(true);

      setTimeout(() => {
        setShowPopover(false);
        setShowDrawer(false);

        setTimeout(() => {
          setShowThankYouMessage(false);
        }, 150); // Allow time for the popover to close before resetting the state
      }, 1500);
    },
    onError: (e) => {
      console.error(e);
    },
  });

  return (
    <>
      {viewportLabel.includes("mobile") ? (
        <RateTabDrawer
          ratingsCount={ratingsCount}
          customClassName={customClassName}
          hoveredRating={hoveredRating}
          selectedRating={selectedRating}
          averageRating={averageRating}
          tabId={tabId}
          tabCreatorUserId={tabCreatorUserId}
          submitRating={submitRating}
          ratingSubmitted={ratingSubmitted}
          setHoveredRating={setHoveredRating}
          setSelectedRating={setSelectedRating}
          setRatingSubmitted={setRatingSubmitted}
          lockOutHoveredRatingRef={lockOutHoveredRatingRef}
          showPopover={showPopover}
          setShowPopover={setShowPopover}
          showDrawer={showDrawer}
          setShowDrawer={setShowDrawer}
          setMobileHeaderModal={setMobileHeaderModal}
          currentUser={currentUser}
          userRating={userRating}
          showThankYouMessage={showThankYouMessage}
        />
      ) : (
        <RateTabPopover
          ratingsCount={ratingsCount}
          customClassName={customClassName}
          hoveredRating={hoveredRating}
          selectedRating={selectedRating}
          averageRating={averageRating}
          tabId={tabId}
          tabCreatorUserId={tabCreatorUserId}
          submitRating={submitRating}
          ratingSubmitted={ratingSubmitted}
          setHoveredRating={setHoveredRating}
          setSelectedRating={setSelectedRating}
          setRatingSubmitted={setRatingSubmitted}
          lockOutHoveredRatingRef={lockOutHoveredRatingRef}
          showPopover={showPopover}
          setShowPopover={setShowPopover}
          showDrawer={showDrawer}
          setShowDrawer={setShowDrawer}
          setMobileHeaderModal={setMobileHeaderModal}
          currentUser={currentUser}
          userRating={userRating}
          showThankYouMessage={showThankYouMessage}
        />
      )}
    </>
  );
}

export default RateTab;

interface RateTabWrapper {
  ratingsCount: number;
  customClassName: string;
  hoveredRating: number | null;
  selectedRating: number | null;
  averageRating: number;
  tabId: number;
  tabCreatorUserId?: string;
  submitRating: (args: {
    tabId: number;
    rating: number;
    tabCreatorUserId?: string;
  }) => void;
  ratingSubmitted: boolean;
  setHoveredRating: Dispatch<SetStateAction<number | null>>;
  setSelectedRating: Dispatch<SetStateAction<number | null>>;
  setRatingSubmitted: Dispatch<SetStateAction<boolean>>;
  lockOutHoveredRatingRef: RefObject<boolean>;
  showPopover: boolean;
  setShowPopover: Dispatch<SetStateAction<boolean>>;
  showDrawer: boolean;
  setShowDrawer: Dispatch<SetStateAction<boolean>>;
  setMobileHeaderModal: (mobileHeaderModal: {
    showing: boolean;
    zIndex: number;
  }) => void;
  currentUser: UserMetadata | null | undefined;
  userRating: number | null;
  showThankYouMessage: boolean;
}

function RateTabPopover({
  ratingsCount,
  customClassName,
  hoveredRating,
  selectedRating,
  averageRating,
  tabId,
  tabCreatorUserId,
  submitRating,
  ratingSubmitted,
  setHoveredRating,
  setSelectedRating,
  setRatingSubmitted,
  lockOutHoveredRatingRef,
  showPopover,
  setShowPopover,
  currentUser,
  userRating,
  showThankYouMessage,
}: RateTabWrapper) {
  const [showUnregisteredPopover, setShowUnregisteredPopover] = useState(false);

  const [unregisteredPopoverTimeoutId, setUnregisteredPopoverTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  return (
    <Popover
      open={showPopover}
      onOpenChange={(open) => {
        if (open === false && showUnregisteredPopover) {
          setShowPopover(false);
          setTimeout(() => {
            setShowUnregisteredPopover(false);
          }, 150); // Allow time for the popover to close before resetting the state
          if (unregisteredPopoverTimeoutId) {
            clearTimeout(unregisteredPopoverTimeoutId);
            setUnregisteredPopoverTimeoutId(null);
          }
        } else if (open === false && showPopover) {
          setShowPopover(false);
          setTimeout(() => {
            setHoveredRating(null);
            setSelectedRating(userRating);
            setRatingSubmitted(userRating ? true : false);
          }, 150); // Allow time for the popover to close before resetting the state
        }
      }}
    >
      <PopoverTrigger
        asChild
        onClick={() => {
          if (!currentUser) {
            setShowPopover(true);
            setShowUnregisteredPopover(true);
            setUnregisteredPopoverTimeoutId(
              setTimeout(() => {
                setShowPopover(false);
                setTimeout(() => {
                  setShowUnregisteredPopover(false);
                }, 150); // Allow time for the popover to close before resetting the state
              }, 2000),
            );
          } else {
            setShowPopover((prev) => !prev);
          }
        }}
        className="baseFlex p-0"
      >
        <Button
          aria-label={"Rate toggle"}
          variant={"secondary"}
          className={customClassName}
          onClick={() => {
            if (!currentUser) return;
          }}
        >
          <motion.div
            key={`tabRatings-${tabId}`}
            variants={opacityAndScaleVariants}
            initial="closed"
            animate="expanded"
            exit="closed"
            transition={{ duration: 0.15 }}
            className="baseFlex !flex-nowrap gap-2 text-base"
          >
            <div className="baseFlex gap-1">
              {averageRating.toFixed(1)}
              {ratingSubmitted ? (
                <FaStar className="size-4" />
              ) : (
                <FaRegStar className="size-4" />
              )}
            </div>
            {`(${formatNumber(ratingsCount)})`}
          </motion.div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="baseFlex w-[350px] bg-pink-100 py-2 text-sm text-pink-950 md:text-base">
        {showUnregisteredPopover ? (
          "Only registered users can rate tabs."
        ) : (
          <RateTabInternals
            hoveredRating={hoveredRating}
            selectedRating={selectedRating}
            averageRating={averageRating}
            tabId={tabId}
            tabCreatorUserId={tabCreatorUserId}
            submitRating={submitRating}
            ratingSubmitted={ratingSubmitted}
            setHoveredRating={setHoveredRating}
            setSelectedRating={setSelectedRating}
            lockOutHoveredRatingRef={lockOutHoveredRatingRef}
            currentUser={currentUser}
            showThankYouMessage={showThankYouMessage}
            userRating={userRating}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function RateTabDrawer({
  ratingsCount,
  hoveredRating,
  selectedRating,
  averageRating,
  tabId,
  tabCreatorUserId,
  submitRating,
  ratingSubmitted,
  setHoveredRating,
  setSelectedRating,
  setRatingSubmitted,
  lockOutHoveredRatingRef,
  showDrawer,
  setShowDrawer,
  setMobileHeaderModal,
  currentUser,
  userRating,
  showThankYouMessage,
}: RateTabWrapper) {
  return (
    <Drawer
      open={showDrawer}
      onOpenChange={(open) => {
        setShowDrawer(open);

        setMobileHeaderModal({
          showing: open,
          zIndex: open ? 49 : 48,
        });

        if (open === false && showDrawer) {
          setTimeout(() => {
            setHoveredRating(null);
            setSelectedRating(userRating);
            setRatingSubmitted(userRating ? true : false);
          }, 150); // Allow time for the drawer to close before resetting the state
        }
      }}
      modal={true}
    >
      <DrawerTrigger asChild>
        <Button
          variant={"secondary"}
          className="baseFlex w-full !flex-nowrap gap-2 text-base"
        >
          <div className="baseFlex gap-1">
            {averageRating.toFixed(1)}
            {ratingSubmitted ? (
              <FaStar className="size-4" />
            ) : (
              <FaRegStar className="size-4" />
            )}
          </div>
          {`(${formatNumber(ratingsCount)})`}
        </Button>
      </DrawerTrigger>
      <DrawerPortal>
        <DrawerContent
          style={{
            textShadow: "none",
          }}
          className="baseVertFlex fixed bottom-0 left-0 right-0 z-50 !items-start gap-4 rounded-t-2xl bg-pink-100 p-4 pb-6 text-pink-950"
        >
          <VisuallyHidden>
            <DrawerTitle>Rate this tab</DrawerTitle>
            <DrawerDescription>
              Rate this tab to help others gauge its quality. Your rating will
              be visible to all users.
            </DrawerDescription>
          </VisuallyHidden>

          {currentUser ? (
            <RateTabInternals
              hoveredRating={hoveredRating}
              selectedRating={selectedRating}
              averageRating={averageRating}
              tabId={tabId}
              tabCreatorUserId={tabCreatorUserId}
              submitRating={submitRating}
              ratingSubmitted={ratingSubmitted}
              setHoveredRating={setHoveredRating}
              setSelectedRating={setSelectedRating}
              lockOutHoveredRatingRef={lockOutHoveredRatingRef}
              currentUser={currentUser}
              showThankYouMessage={showThankYouMessage}
              userRating={userRating}
            />
          ) : (
            <div className="baseVertFlex my-8 w-full gap-8">
              <p className="font-medium">
                Only registered users can rate tabs.
              </p>

              <div className="baseFlex">
                <SignInButton
                  mode="modal"
                  // afterSignUpUrl={`${
                  //   process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                  // }/postSignUpRegistration`}
                  // afterSignInUrl={`${
                  //   process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                  // }${asPath}`}
                >
                  <Button className="baseFlex gap-2 px-8">
                    <FaUser className="size-4" />
                    Sign in
                  </Button>
                </SignInButton>
              </div>
            </div>
          )}
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

interface RateTabInternals {
  hoveredRating: number | null;
  selectedRating: number | null;
  averageRating: number;
  tabId: number;
  tabCreatorUserId?: string;
  submitRating: (args: {
    tabId: number;
    rating: number;
    tabCreatorUserId?: string;
  }) => void;
  ratingSubmitted: boolean;
  setHoveredRating: (rating: number | null) => void;
  setSelectedRating: (rating: number | null) => void;
  lockOutHoveredRatingRef: RefObject<boolean>;
  currentUser: UserMetadata | null | undefined;
  showThankYouMessage: boolean;
  userRating: number | null;
}

function RateTabInternals({
  hoveredRating,
  selectedRating,
  averageRating,
  tabId,
  tabCreatorUserId,
  submitRating,
  ratingSubmitted,
  setHoveredRating,
  setSelectedRating,
  lockOutHoveredRatingRef,
  currentUser,
  showThankYouMessage,
  userRating,
}: RateTabInternals) {
  return (
    <div className="baseVertFlex w-full gap-4 overflow-x-hidden">
      <div className="baseVertFlex w-full gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`ratingTitle${hoveredRating ?? selectedRating ?? averageRating}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15 }}
            className="baseFlex gap-2 text-lg font-medium"
          >
            {hoveredRating || selectedRating
              ? ratingTitles[
                  hoveredRating
                    ? hoveredRating - 1
                    : selectedRating
                      ? selectedRating - 1
                      : averageRating - 1
                ]
              : "Rate this tab"}
          </motion.div>
        </AnimatePresence>

        <div className="baseFlex w-full">
          {[1, 2, 3, 4, 5].map((starValue) => {
            return (
              <div
                key={`star-${starValue}`}
                onMouseEnter={() => {
                  if (lockOutHoveredRatingRef.current || ratingSubmitted)
                    return;

                  setHoveredRating(starValue);
                }}
                onMouseLeave={() => {
                  if (lockOutHoveredRatingRef.current) {
                    lockOutHoveredRatingRef.current = false;
                  }

                  setHoveredRating(null);
                }}
                onClick={() => {
                  lockOutHoveredRatingRef.current = true;
                  setHoveredRating(null);
                  setSelectedRating(starValue);
                }}
                className="baseFlex !size-8 !shrink-0 cursor-pointer"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {!hoveredRating &&
                  selectedRating &&
                  selectedRating >= starValue ? (
                    <motion.div
                      key={`filled-star-${starValue}`}
                      initial={{ scale: 0 }}
                      animate={{
                        scale: 1,
                      }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      onMouseEnter={() => {
                        if (selectedRating && selectedRating >= starValue)
                          return;
                        setHoveredRating(starValue);
                      }}
                      onMouseLeave={() => {
                        if (selectedRating && selectedRating >= starValue)
                          return;

                        setHoveredRating(null);
                      }}
                      onClick={() => {
                        setSelectedRating(starValue);
                      }}
                      className="baseFlex"
                    >
                      <FaStar className="!size-8 !shrink-0 text-yellow-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`outline-star-${starValue}`}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        color: hoveredRating
                          ? hoveredRating >= starValue
                            ? "#eab308"
                            : "#78716c"
                          : "#78716c",
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="baseFlex"
                    >
                      <FaRegStar className="!size-8 !shrink-0" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* description of hovered rating */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={`ratingDescription${hoveredRating ?? selectedRating ?? averageRating}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          className="baseFlex gap-2 text-center opacity-80"
        >
          {hoveredRating || selectedRating
            ? ratingDescriptions[
                hoveredRating
                  ? hoveredRating - 1
                  : selectedRating
                    ? selectedRating - 1
                    : averageRating - 1
              ]
            : "Let others know the quality of this tab. Your rating will be visible to all users."}
        </motion.p>
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {showThankYouMessage ? (
          <motion.p
            key={`ratingSubmitText`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="baseFlex h-10 gap-2 text-center text-stone-500"
          >
            Thank you for your feedback!
          </motion.p>
        ) : (
          <motion.div
            key={`ratingSubmitButton`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="baseFlex"
          >
            <Button
              aria-label={"Submit rating"}
              variant={"default"}
              disabled={
                !selectedRating || !currentUser || userRating === selectedRating
              }
              className="px-8"
              onClick={() => {
                if (!selectedRating || !currentUser) return;

                submitRating({
                  tabId,
                  rating: selectedRating,
                  tabCreatorUserId,
                });
              }}
            >
              Submit
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
