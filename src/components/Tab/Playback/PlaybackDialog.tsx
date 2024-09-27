
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "~/components/ui/carousel"
import { Fragment, useCallback, useEffect, useState } from "react"
import { useTabStore } from "~/stores/TabStore";
import AutoScroll from "embla-carousel-auto-scroll";
import PlaybackTabNotesColumn from "~/components/Tab/Playback/PlaybackTabNotesColumn";
import PlaybackSectionContainer from "~/components/Tab/Playback/PlaybackSectionContainer";


function PlaybackDialog() {


    const {
      // compiledTabData,
      tuning,
      currentChordIndex,
      playbackSpeed,
      expandedTabData,
  } = useTabStore((state) => ({
      // compiledTabData: state.compiledTabData,
      tuning: state.tuning,
      currentChordIndex: state.currentChordIndex,
      playbackSpeed: state.playbackSpeed,
      expandedTabData: state.expandedTabData,
  }));

const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

    const onButtonAutoplayClick = useCallback(
    (callback: () => void) => {
      const autoScroll = api?.plugins()?.autoScroll
      if (!autoScroll) return

      const resetOrStop =
        autoScroll.options.stopOnInteraction === false
          ? autoScroll.reset
          : autoScroll.stop

      resetOrStop()
      callback()
    },
    [api]
  )

  const toggleAutoplay = useCallback(() => {
    const autoScroll = api?.plugins()?.autoScroll
    if (!autoScroll) return

    const playOrStop = autoScroll.isPlaying()
      ? autoScroll.stop
      : autoScroll.play
    playOrStop()
  }, [api])

  useEffect(() => {
    const autoScroll = api?.plugins()?.autoScroll
    if (!autoScroll) return

    setIsPlaying(autoScroll.isPlaying())
    api
      .on('autoScroll:play', () => setIsPlaying(true))
      .on('autoScroll:stop', () => setIsPlaying(false))
      .on('reInit', () => setIsPlaying(autoScroll.isPlaying()))
  }, [api])


// const { speed} = useAutoScrollSpeed(
//     compiledTabData?.metadata[currentChordIndex]?.bpm ?? 60,
//     compiledTabData?.metadata[currentChordIndex]?.noteLengthMultiplier ?? "1",
//     playbackSpeed
//   );

  console.log("currenchordindex", currentChordIndex)

  useEffect(() => {
    if (!api) return;

    api.scrollTo(currentChordIndex);
  }, [api, currentChordIndex]) 


  // if (compiledTabData === null) return;

  if (expandedTabData === null) return;

  // console.log("1", 
  //   compiledTabData?.metadata[currentChordIndex]?.bpm,
  //   compiledTabData?.metadata[currentChordIndex]?.noteLengthMultiplier);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Practice tab</Button>
      </DialogTrigger>
      <DialogContent className=" w-full max-w-6xl overflow-hidden bg-black">

      {/* <VisuallyHidden>
          <DialogTitle>
            Shuffling deck for round {gameData.currentRound}
          </DialogTitle>
          <DialogDescription>
            The decks are being shuffled for the upcoming round
          </DialogDescription>
        </VisuallyHidden> */}

        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

    <div className="baseFlex !justify-start !flex-nowrap w-full">
   

        <Carousel setApi={setApi} opts={{
          loop: true,
          dragFree: true,
          align: "start", // this could be a problem... we really need to align to the center right?
          // maybe there is a decent alternative
        }}

        // plugins={[
        //   AutoScroll({
        //     speed: speed,
        //   })
        // ]}

        className="w-full max-w-lg">
          <CarouselContent 
          style={{
          // transform: `translateX(-${currentChordIndex * 35}px)`,
          // transitionDuration: `${60 /
          //   ((Number(compiledTabData.metadata[currentChordIndex]!.bpm) /
          //     Number(compiledTabData.metadata[currentChordIndex]!.noteLengthMultiplier)) *
          //     playbackSpeed) +
          // 1}s`,
          // transitionTimingFunction: "linear",
        }}
          className="w-full">
            {expandedTabData.map((section, index) => (
              <PlaybackSectionContainer
                key={index}
                sectionData={section}
              />
            ))}
          </CarouselContent>
          
        </Carousel>

     

        
      </div>

       <button className="embla__play" onClick={toggleAutoplay} type="button">
          {isPlaying ? 'Stop' : 'Start'}
        </button>
      </DialogContent>
    </Dialog>
  )
}

export default PlaybackDialog;

interface AutoScrollSpeedHookResult {
  speed: number;

}

const useAutoScrollSpeed = (
  bpm: number,
  noteLengthMultiplier: string,
  playbackSpeed: number,
  elementWidth = 35
): AutoScrollSpeedHookResult => {
  const [fps, setFps] = useState<number>(60); // Default to 60 FPS

  useEffect(() => {
    // Detect screen refresh rate
    const detectRefreshRate = (): (() => void) => {
      let requestId: number;
      const frameTimes: number[] = [];
      let frameIndex = 0;
      
      const onFrame = (timestamp: number): void => {
        if (frameTimes.length > 10) {
          frameTimes.shift();
        }
        frameTimes.push(timestamp);
        frameIndex++;

        if (frameIndex > 10) {
          const detectedFps = Math.round(1000 / ((frameTimes[frameTimes.length - 1]! - frameTimes[0]!) / frameTimes.length));
          setFps(detectedFps);
          return;
        }
        
        requestId = requestAnimationFrame(onFrame);
      };
      
      requestId = requestAnimationFrame(onFrame);
      
      return () => cancelAnimationFrame(requestId);
    };

    const cleanup = detectRefreshRate();
    return cleanup;
  }, []);

  const calculateScrollSpeed = useCallback((): number => {

    // console.log(noteLengthMultiplier)

    // Calculate beats per second
    const beatsPerSecond = bpm / 60;

    // Calculate chord duration in seconds
    const chordDurationInSeconds = (1 / beatsPerSecond) * parseInt(noteLengthMultiplier);

    // Adjust for playback speed
    const adjustedChordDuration = chordDurationInSeconds / playbackSpeed;

    // Calculate pixels per second
    const pixelsPerSecond = elementWidth / adjustedChordDuration;

    // Convert pixels per second to pixels per frame (using dynamic FPS)
    const pixelsPerFrame = pixelsPerSecond / fps;

    return pixelsPerFrame;
  }, [bpm, noteLengthMultiplier, playbackSpeed, elementWidth, fps]);

  return {
    speed: calculateScrollSpeed(),
  };
};
