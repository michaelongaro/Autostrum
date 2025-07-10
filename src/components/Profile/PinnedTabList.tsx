import { useState, type Dispatch, type SetStateAction } from "react";
import { api } from "~/utils/api";
import { TbPinned } from "react-icons/tb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Table, TableBody, TableRow, TableCell } from "~/components/ui/table";
import { Label } from "~/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import Binoculars from "~/components/ui/icons/Binoculars";
import { Button } from "~/components/ui/button";
import { formatNumber } from "~/utils/formatNumber";
import formatDate from "~/utils/formatDate";
import { X } from "lucide-react";

interface PinnedTabList {
  userId: string;
  localPinnedTabId: number | null;
  setLocalPinnedTabId: Dispatch<SetStateAction<number | null>>;
  setShowPinnedTabModal?: Dispatch<SetStateAction<boolean>>;
}

function PinnedTabList({
  userId,
  localPinnedTabId,
  setLocalPinnedTabId,
  setShowPinnedTabModal,
}: PinnedTabList) {
  const [sortBy, setSortBy] = useState<
    "Newest" | "Oldest" | "Most popular" | "Least popular"
  >("Most popular");

  const { data: userTabs, isFetching: isFetchingUserTabs } =
    api.tab.getTabsForPinnedTabSelector.useQuery({
      userId,
      sortBy,
    });

  return (
    <div className="baseVertFlex size-full !items-start !justify-start">
      <div className="baseFlex my-2 w-full !justify-between gap-2 px-2 lg:mt-0 lg:px-0">
        <div className="baseFlex gap-1">
          <TbPinned className="size-4 stroke-[2.5px] lg:size-5" />
          <span className="font-medium lg:text-lg">Pinned tab</span>
        </div>
        <div className="baseFlex gap-2">
          <Label className="text-nowrap">Sort by</Label>
          <Select
            disabled={isFetchingUserTabs}
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value as "Newest" | "Oldest" | "Most popular");
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={"Most popular"}>Most popular</SelectItem>

              <SelectItem value={"Least popular"}>Least popular</SelectItem>

              <SelectItem value={"Newest"}>Newest</SelectItem>

              <SelectItem value={"Oldest"}>Oldest</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={"text"}
            className="hidden !size-8 shrink-0 !p-0 lg:flex"
            onClick={() => {
              setShowPinnedTabModal?.(false);
            }}
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* table headers */}
      <div className="w-full bg-accent">
        <div
          className="grid h-8 grid-rows-1 items-center text-sm font-medium text-muted"
          style={{
            gridTemplateColumns: "50px auto 100px",
          }}
        >
          {/* "radio" selection status column */}
          <div className="h-full px-4"></div>

          <div className="px-4">Title</div>

          <div className="px-4">
            {sortBy.includes("popular") ? "Views" : "Date"}
          </div>
        </div>
      </div>

      {/* list of user's tabs */}
      <AnimatePresence mode="wait">
        {isFetchingUserTabs && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="baseFlex size-full lg:min-h-[350px]"
          >
            <svg
              className="size-8 animate-stableSpin rounded-full bg-inherit fill-none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </motion.div>
        )}

        {!isFetchingUserTabs && userTabs && userTabs.length === 0 && (
          <motion.div
            key="noResultsFound"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="baseFlex size-full lg:min-h-[350px]"
          >
            <div className="baseVertFlex gap-4 rounded-md border bg-secondary-active/50 px-8 py-4 text-xl shadow-lg">
              <div className="baseVertFlex gap-4">
                <Binoculars className="size-9" />
                No results found
              </div>
            </div>
          </motion.div>
        )}

        {!isFetchingUserTabs && userTabs && userTabs.length > 0 && (
          <motion.div
            key="userTabs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="baseVertFlex h-[336px] gap-2 overflow-hidden lg:h-auto lg:pb-0"
          >
            <OverlayScrollbarsComponent
              options={{
                scrollbars: { autoHide: "leave", autoHideDelay: 150 },
              }}
              defer
              className="w-full"
            >
              <div className="relative w-full">
                <Table>
                  <colgroup id="tableTabViewColGroup">
                    {/* "radio" selection status column */}
                    <col className="w-[50px]" />
                    {/* Title */}
                    <col className="w-auto" />
                    {/* Views / Date */}
                    <col className="w-[100px]" />
                  </colgroup>

                  <AnimatePresence mode="popLayout">
                    <TableBody className="w-full @container">
                      {userTabs.map((tab) => (
                        // if tab.id === localPinnedTabId, make background slightly highlighted
                        <TableRow key={tab.id} className="w-full">
                          <TableCell>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="baseFlex !size-5 w-full !shrink-0 rounded-full outline outline-1"
                            >
                              <Button
                                variant={"text"}
                                className={`!size-4 !shrink-0 rounded-full border-none !p-0 hover:bg-primary ${tab.id === localPinnedTabId ? "bg-primary" : ""} `}
                                onClick={() => {
                                  setLocalPinnedTabId(tab.id);
                                }}
                              />
                            </motion.div>
                          </TableCell>

                          <TableCell>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 1.25 }}
                              className="w-full"
                            >
                              <span className="max-w-[230px] truncate sm:max-w-[300px]">
                                {tab.title}
                              </span>
                            </motion.div>
                          </TableCell>

                          <TableCell>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 1.25 }}
                              className="w-full"
                            >
                              {sortBy.includes("popular")
                                ? formatNumber(tab.pageViews)
                                : formatDate(tab.createdAt)}
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </AnimatePresence>
                </Table>
              </div>
            </OverlayScrollbarsComponent>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PinnedTabList;
