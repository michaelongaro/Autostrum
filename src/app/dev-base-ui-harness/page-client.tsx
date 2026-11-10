"use client";

// Development interaction fixture. Browser tests mock the pinned-tab read API;
// the remaining controls use local data.
import ErrorPage from "~/components/errors/NotFoundContent";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import TabZoomControl from "~/components/Tab/TabZoomControl";
import EditImageSelector from "~/components/Profile/EditImageSelector";
import type { Area, Point } from "react-easy-crop";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "~/components/ui/drawer";
import { NoteLengthDropdown } from "~/components/Tab/NoteLengthDropdown";
import type { FullNoteLengths } from "~/stores/TabStore";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "~/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "~/components/ui/alert-dialog";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "~/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import GlossaryDialog from "~/components/Dialogs/GlossaryDialog";
import BookmarkToggle from "~/components/ui/BookmarkToggle";
import { useTabStoreApi } from "~/stores/TabStore";
import { Toggle } from "~/components/ui/toggle";
import { AnimatedToggleGroup } from "~/components/ui/AnimatedToggleGroup";
import PinnedTabModal from "~/components/modals/PinnedTabModal";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";

function GlossaryBookmarkFixture() {
  const tabStore = useTabStoreApi();
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <section
      data-testid="glossary-bookmark-fixture"
      className="flex flex-col gap-4"
    >
      <Button onClick={() => setBookmarked((value) => !value)}>
        Toggle bookmark visual
      </Button>
      <BookmarkToggle
        tabId={0}
        createdByUserId={null}
        currentUser={null}
        customClassName="w-fit gap-2 px-3 py-1"
        showText
        isBookmarked={bookmarked}
      />
      <Button
        onClick={() => {
          tabStore.setState({ editing: false, showGlossaryDialog: true });
        }}
      >
        Open viewing glossary
      </Button>
      <Button
        onClick={() => {
          tabStore.setState({ editing: true, showGlossaryDialog: true });
        }}
      >
        Open editing glossary
      </Button>
      <GlossaryDialog />
    </section>
  );
}

function ProfileImageFixture() {
  const image =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#cca780"/><circle cx="400" cy="400" r="200" fill="#604638"/></svg>',
    );
  const [source, setSource] = useState<string | null>(image);
  const [profile, setProfile] = useState<string | null>(image);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [, setModal] = useState(false);
  return (
    <section data-testid="profile-image-fixture">
      <EditImageSelector
        imageBeingEdited={source}
        setImageBeingEdited={setSource}
        newProfileImage={profile}
        setNewProfileImage={setProfile}
        crop={crop}
        setCrop={setCrop}
        rotation={rotation}
        setRotation={setRotation}
        zoom={zoom}
        setZoom={setZoom}
        croppedAreaPixels={area}
        setCroppedAreaPixels={setArea}
        setShowEditImageModal={setModal}
        localSettings={null}
      />
    </section>
  );
}

const subscribeToHydration = () => () => undefined;
const clientHydrated = () => true;
const serverHydrated = () => false;

export default function DevBaseUiHarness() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientHydrated,
    serverHydrated,
  );
  const [value, setValue] = useState("item-0");
  const [toggleValue, setToggleValue] = useState<"auto" | "manual">("auto");
  const [showPinnedTabModal, setShowPinnedTabModal] = useState(false);
  const [pinnedTabId, setPinnedTabId] = useState<number | null>(null);
  const [actionCount, setActionCount] = useState(0);
  const [noteLength, setNoteLength] = useState<FullNoteLengths>("quarter");
  const [swipeLocked, setSwipeLocked] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomInteracting, setZoomInteracting] = useState(false);
  if (process.env.NODE_ENV === "production") return <ErrorPage />;
  return (
    <main
      className="mx-auto flex max-w-md flex-col gap-5 p-8"
      data-testid="base-ui-harness"
      data-ready={hydrated}
    >
      <h1>Base UI interaction fixture</h1>
      <Button onClick={() => setShowPinnedTabModal(true)}>
        Open pinned tab modal
      </Button>
      {showPinnedTabModal && (
        <PinnedTabModal
          localPinnedTabId={pinnedTabId}
          setLocalPinnedTabId={setPinnedTabId}
          setShowPinnedTabModal={setShowPinnedTabModal}
        />
      )}
      <AnimatedToggleGroup
        aria-label="Masked toggle fixture"
        value={toggleValue}
        onValueChange={setToggleValue}
        className="w-fit"
        size="sm"
        options={[
          { value: "auto", label: "Auto", className: "w-[55px]" },
          { value: "manual", label: "Manual", className: "w-[72px]" },
        ]}
      />
      <Button
        role="link"
        nativeButton={false}
        render={<Link href="#link-target">Link button</Link>}
      />
      <Accordion>
        <AccordionItem value="one">
          <AccordionTrigger forFAQ>Expand details</AccordionTrigger>
          <AccordionContent>
            <p>Accordion details</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next !== null) setValue(next);
        }}
      >
        <SelectTrigger aria-label="Fixture select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Options</SelectLabel>
            {Array.from({ length: 30 }, (_, i) => (
              <SelectItem key={i} value={`item-${i}`}>
                Option {i}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Checkbox id="fixture-checkbox" />
        <Label htmlFor="fixture-checkbox">Fixture checkbox</Label>
        <Checkbox aria-label="Disabled checkbox" disabled />
      </div>
      <Switch aria-label="Fixture switch" />
      <Toggle aria-label="Fixture toggle">Toggle</Toggle>
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="outline">Tooltip target</Button>}
          />
          <TooltipContent>Fixture tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Popover>
        <PopoverTrigger render={<Button>Open popover</Button>} />
        <PopoverContent side="bottom" align="start">
          <Label htmlFor="popover-input">Popover input</Label>
          <input id="popover-input" className="w-full" />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger render={<Button>Arrowless popover</Button>} />
        <PopoverContent showArrow={false} sideOffset={7}>
          Arrowless spacing
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger render={<Button>Custom offset popover</Button>} />
        <PopoverContent sideOffset={() => 8}>Custom spacing</PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button>Open menu</Button>} />
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setActionCount((c) => c + 1)}>
              Run action
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More actions</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setActionCount((c) => c + 1)}>
                Nested action
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuRadioGroup defaultValue="a">
            <DropdownMenuRadioItem value="a">Radio A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Radio B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <output aria-label="Action count">{actionCount}</output>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button>Open note length menu</Button>} />
        <DropdownMenuContent>
          <NoteLengthDropdown
            value={noteLength}
            onValueChange={setNoteLength}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <output aria-label="Selected note length">{noteLength}</output>
      <Dialog>
        <DialogTrigger render={<Button>Open dialog</Button>} />
        <DialogContent>
          <DialogTitle>Fixture dialog</DialogTitle>
          <DialogDescription>Focus and nested popup check</DialogDescription>
          <input aria-label="Dialog input" />
          <Select defaultValue="a">
            <SelectTrigger aria-label="Nested select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Alpha</SelectItem>
              <SelectItem value="b">Beta</SelectItem>
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
      <AlertDialog>
        <AlertDialogTrigger render={<Button>Open alert</Button>} />
        <AlertDialogContent>
          <AlertDialogTitle>Fixture alert</AlertDialogTitle>
          <AlertDialogDescription>
            Cancel or confirm this local action.
          </AlertDialogDescription>
          <AlertDialogCancel>Cancel action</AlertDialogCancel>
          <AlertDialogAction onClick={() => setActionCount((c) => c + 1)}>
            Confirm action
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
      <Drawer swipeDisabled={swipeLocked || zoomInteracting}>
        <DrawerTrigger render={<Button>Open drawer</Button>} />
        <DrawerContent className="gap-4 p-4">
          <DrawerTitle>Fixture drawer</DrawerTitle>
          <DrawerDescription>
            Swipe, nested popup, and focus check.
          </DrawerDescription>
          <TabZoomControl
            zoom={zoom}
            onZoomChange={setZoom}
            onZoomInteractionChange={setZoomInteracting}
          />
          <Select defaultValue="a">
            <SelectTrigger aria-label="Drawer select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Alpha</SelectItem>
              <SelectItem value="b">Beta</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox
              id="swipe-lock"
              checked={swipeLocked}
              onCheckedChange={setSwipeLocked}
            />
            <Label htmlFor="swipe-lock">Lock swipe</Label>
          </div>
          <DrawerClose render={<Button>Close drawer</Button>} />
        </DrawerContent>
      </Drawer>
      <ProfileImageFixture />
      <GlossaryBookmarkFixture />
      <div id="link-target">Link destination</div>
    </main>
  );
}
