import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { HiOutlineInformationCircle } from "react-icons/hi";

function EffectGlossary() {
  const { setShowingEffectGlossary } = useTabStore(
    (state) => ({
      setShowingEffectGlossary: state.setShowingEffectGlossary,
    }),
    shallow
  );

  // TODO: modularize this component as much as possible

  return (
    <Popover
      onOpenChange={(open) => {
        setShowingEffectGlossary(open ? true : false);
      }}
      modal={false}
      open={true}
    >
      <PopoverTrigger asChild>
        {/* just used as an anchor for the popover to attach to */}
        <div></div>
      </PopoverTrigger>

      <PopoverContent
        showArrow={false}
        side={"bottom"}
        onClick={(e) => e.stopPropagation()}
        className="baseVertFlex w-64 !items-start gap-[0.35rem] bg-pink-50 text-pink-950"
      >
        <Label>Section effects</Label>
        <Separator className="mb-2 w-full bg-pink-500" />

        <div className="grid w-full grid-cols-5 pl-1 ">
          <span className="col-span-1">PM</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Palm mute</span>
        </div>
        <Label className="mt-2">Note effects</Label>
        <Separator className="mb-2 w-full bg-pink-500" />

        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">h</span>
          <span className="col-span-1">-</span>
          <span className="baseFlex col-span-3 !justify-between">
            Hammer-on
            <Popover>
              <PopoverTrigger className=" rounded-md p-1 transition-all hover:bg-pink-500/20 active:bg-pink-500/10">
                <HiOutlineInformationCircle className="h-5 w-5" />
              </PopoverTrigger>
              <PopoverContent
                side={"bottom"}
                className="baseVertFlex max-w-[300px] md:max-w-none"
              >
                <div className="font-bold">Valid notation examples</div>
                <Separator className="mb-2 w-full" />
                <div className="baseFlex gap-8">
                  <div className="baseVertFlex gap-2">
                    <p className="font-semibold">Condensed</p>
                    <div className="baseFlex">
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        3h
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        5
                      </div>
                    </div>
                  </div>
                  <div className="baseVertFlex gap-2">
                    <p className="font-semibold">Expanded</p>
                    <div className="baseFlex">
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        3
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        h
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        5
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">p</span>
          <span className="col-span-1">-</span>
          <span className="baseFlex col-span-3 !justify-between">
            Pull-off
            <Popover>
              <PopoverTrigger className=" rounded-md p-1 transition-all hover:bg-pink-500/20 active:bg-pink-500/10">
                <HiOutlineInformationCircle className="h-5 w-5" />
              </PopoverTrigger>
              <PopoverContent
                side={"bottom"}
                className="baseVertFlex max-w-[300px] md:max-w-none"
              >
                <div className="font-bold">Valid notation examples</div>
                <Separator className="mb-2 w-full" />
                <div className="baseFlex gap-8">
                  <div className="baseVertFlex gap-2">
                    <p className="font-semibold">Condensed</p>
                    <div className="baseFlex">
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        3p
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        5
                      </div>
                    </div>
                  </div>
                  <div className="baseVertFlex gap-2">
                    <p className="font-semibold">Expanded</p>
                    <div className="baseFlex">
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        3
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        p
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        5
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">/</span>
          <span className="col-span-1">-</span>
          <span className="baseFlex col-span-3 !justify-between">
            Slide up
            <Popover>
              <PopoverTrigger className=" rounded-md p-1 transition-all hover:bg-pink-500/20 active:bg-pink-500/10">
                <HiOutlineInformationCircle className="h-5 w-5" />
              </PopoverTrigger>
              <PopoverContent
                side={"bottom"}
                className="baseVertFlex max-w-[300px] md:max-w-none"
              >
                <div className="font-bold">Valid notation examples</div>
                <Separator className="mb-2 w-full" />
                <div className="baseFlex gap-8">
                  <div className="baseVertFlex gap-2">
                    <p className="font-semibold">Condensed</p>
                    <div className="baseFlex">
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        3/
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        5
                      </div>
                    </div>
                  </div>
                  <div className="baseVertFlex gap-2">
                    <p className="font-semibold">Expanded</p>
                    <div className="baseFlex">
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        3
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        /
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        5
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">\</span>
          <span className="col-span-1">-</span>
          <span className="baseFlex col-span-3 !justify-between">
            Slide down
            <Popover>
              <PopoverTrigger className=" rounded-md p-1 transition-all hover:bg-pink-500/20 active:bg-pink-500/10">
                <HiOutlineInformationCircle className="h-5 w-5" />
              </PopoverTrigger>
              <PopoverContent
                side={"bottom"}
                className="baseVertFlex max-w-[300px] md:max-w-none"
              >
                <div className="font-bold">Valid notation examples</div>
                <Separator className="mb-2 w-full" />
                <div className="baseFlex gap-8">
                  <div className="baseVertFlex gap-2">
                    <p className="font-semibold">Condensed</p>
                    <div className="baseFlex">
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        3\
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        5
                      </div>
                    </div>
                  </div>
                  <div className="baseVertFlex gap-2">
                    <p className="font-semibold">Expanded</p>
                    <div className="baseFlex">
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        3
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        \
                      </div>
                      <div className="h-[1px] w-2 bg-pink-50"></div>
                      <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-50 text-sm">
                        5
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">{">"}</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Accented</span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">.</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Stacatto</span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">b</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Bend</span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">x</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Muted note</span>
        </div>
        <Label className="mt-2">Chord effects</Label>
        <Separator className="mb-2 w-full bg-pink-500" />

        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">^</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Strum up</span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">v</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Strum down</span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">s</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Slap</span>
        </div>
        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">{">"}</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Accented</span>
        </div>
        <Label className="mt-2">Miscellaneous</Label>
        <Separator className="mb-2 w-full bg-pink-500" />

        <div className="grid w-full grid-cols-5 pl-1">
          <span className="col-span-1">|</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Measure line</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default EffectGlossary;
