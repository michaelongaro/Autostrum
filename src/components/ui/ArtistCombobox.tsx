"use client";

import { useEffect, useMemo, useState } from "react";
import { BiSearchAlt2 } from "react-icons/bi";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "~/utils/cn";
import { BsPlus } from "react-icons/bs";
import { GiMicrophone } from "react-icons/gi";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useTabStore } from "~/stores/TabStore";
import { IoClose } from "react-icons/io5";
import { api } from "~/utils/api";
import debounce from "lodash.debounce";
import { Input } from "~/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import Verified from "~/components/ui/icons/Verified";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import Spinner from "~/components/ui/Spinner";

function ArtistCombobox() {
  const {
    artistId,
    artistName,
    artistIsVerified,
    setArtistId,
    setArtistName,
    setArtistIsVerified,
  } = useTabStore((state) => ({
    artistId: state.artistId,
    artistName: state.artistName,
    artistIsVerified: state.artistIsVerified,
    setArtistId: state.setArtistId,
    setArtistName: state.setArtistName,
    setArtistIsVerified: state.setArtistIsVerified,
  }));

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const { data: artistSearchResults, isFetching: isFetchingArtistResults } =
    api.search.getArtistUsernamesBySearchQuery.useQuery(
      {
        query: debouncedSearchQuery,
      },
      {
        enabled: debouncedSearchQuery.length > 0,
      },
    );

  const debouncedSetSearch = useMemo(
    () =>
      debounce((query: string) => {
        setDebouncedSearchQuery(query);
      }, 250),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel(); // Cancel any pending executions
    };
  }, [debouncedSetSearch]);

  return (
    <Popover
      open={open}
      modal={true}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          // Reset search query when the popover is closed

          setTimeout(() => {
            setSearchQuery("");
          }, 15); // slightly delay to ensure the popover closes first
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id="artistCombobox"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full max-w-72 justify-between font-normal text-foreground"
        >
          {artistName ? (
            <span className="baseFlex max-w-full !justify-start gap-1.5">
              {artistIsVerified && (
                <Verified className="inline size-4 shrink-0" />
              )}
              <span
                className={`truncate ${artistIsVerified ? "max-w-48" : "max-w-52"}`}
              >
                {artistName}
              </span>
            </span>
          ) : (
            <span>Select artist...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" className="w-[300px] p-0">
        <div className="baseFlex border-b px-3">
          <BiSearchAlt2 className="mr-2 mt-1 size-5 shrink-0 opacity-50" />
          <Input
            placeholder="Enter artist name..."
            maxLength={60}
            onChange={(e) => {
              const query = e.target.value;
              setSearchQuery(query);

              const trimmedQuery = query.trim();
              if (trimmedQuery !== searchQuery) {
                debouncedSetSearch(trimmedQuery);
              }
            }}
            value={searchQuery}
            showFocusState={false}
            className="flex h-11 w-full rounded-md !border-none bg-transparent py-3 text-base outline-none placeholder:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />

          <AnimatePresence>
            {isFetchingArtistResults && (
              <motion.div
                key={"loadingArtistSearchResults"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="baseVertFlex"
              >
                <Spinner className="size-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="overflow-y-hidden">
          <OverlayScrollbarsComponent
            options={{
              scrollbars: { autoHide: "leave", autoHideDelay: 150 },
            }}
            defer
            className="max-h-[300px] w-full"
          >
            <div className={`max-h-60 ${artistName ? "h-[200px]" : "h-60"}`}>
              <AnimatePresence mode={"popLayout"}>
                {searchQuery.trim().length === 0 && (
                  <motion.div
                    key={"defaultArtistSearchResults"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.2,
                    }}
                    className="baseVertFlex h-full gap-2"
                  >
                    <motion.div
                      layout="position"
                      className="baseVertFlex gap-2"
                    >
                      <GiMicrophone className="h-6 w-6" />
                      <span className="text-sm font-medium">
                        Enter an artist&apos;s name above
                      </span>
                    </motion.div>
                  </motion.div>
                )}

                {searchQuery.trim().length > 0 &&
                  artistSearchResults &&
                  artistSearchResults.length > 0 && (
                    <motion.div
                      key={"artistSearchResults"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="baseVertFlex size-full !justify-start"
                    >
                      {artistSearchResults.map((artist) => (
                        <Button
                          key={artist.id}
                          variant={"text"}
                          value={`${artist.id}`}
                          onClick={() => {
                            setArtistId(artist.id);
                            setArtistName(artist.name);
                            setArtistIsVerified(artist.isVerified);
                          }}
                          className="relative flex w-full select-none items-center justify-between rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:!text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                        >
                          <Check
                            className={cn(
                              "ml-1 mr-3 size-4 shrink-0 text-inherit",
                              artistId === artist.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="baseFlex w-full !justify-start gap-2 font-medium">
                            {artist.isVerified && (
                              <Verified className="size-4" />
                            )}
                            <div>{artist.name}</div>
                          </div>
                        </Button>
                      ))}
                    </motion.div>
                  )}

                {searchQuery.trim().length > 0 &&
                  !isFetchingArtistResults &&
                  artistSearchResults &&
                  artistSearchResults.length === 0 && (
                    <motion.div
                      key={"noArtistSearchResults"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="baseVertFlex size-full gap-4"
                    >
                      <span className="baseVertFlex w-48">
                        No results found for
                        <span className="w-full break-words text-center">
                          &ldquo;
                          {searchQuery}
                          &rdquo;
                        </span>
                      </span>
                      <Button
                        onClick={() => {
                          setOpen(false);

                          setTimeout(() => {
                            setArtistName(searchQuery);
                            setSearchQuery("");
                          }, 0); // slight delay to ensure the popover is closed first
                        }}
                        className="baseFlex gap-1"
                      >
                        <BsPlus className="size-5" />
                        Add artist
                      </Button>
                      <span className="w-52 text-balance text-center text-xs opacity-75">
                        Please ensure the artist&apos;s name is properly spelled
                        and capitalized.
                      </span>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
          </OverlayScrollbarsComponent>

          <AnimatePresence mode={"popLayout"} initial={false}>
            {artistName && (
              <motion.div
                key={"detachArtistButton"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="baseVertFlex h-10 w-full text-destructive"
              >
                <div className="h-[1px] w-full bg-border"></div>
                <Button
                  variant={"link"}
                  onClick={() => {
                    setArtistId(null);
                    setArtistName("");
                    setArtistIsVerified(false);
                  }}
                  className="baseFlex h-9 gap-1 p-0"
                >
                  <IoClose className="size-4" />
                  Detach artist
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ArtistCombobox;
