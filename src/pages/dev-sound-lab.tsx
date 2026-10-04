// Dev-only listening page for every note, strum, and section effect that
// changes playback. getServerSideProps returns 404 in production builds, and
// the client renders 404 as well. Open /dev-sound-lab from `next dev`.
// Optional ?capo=0..12 shifts every fret so capo playback can be checked too.
import ErrorPage from "next/error";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AudioControls from "~/components/AudioControls/AudioControls";
import Chords from "~/components/Tab/Chords";
import SectionContainer from "~/components/Tab/SectionContainer";
import StrummingPatterns from "~/components/Tab/StrummingPatterns";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useSpacebarAudioControl from "~/hooks/useSpacebarAudioControl";
import { useSectionIds } from "~/hooks/useTabDataSelectors";
import {
  createVerifiedSoundLab,
  SOUND_LAB_BPM,
  SOUND_LAB_CHORD_COUNT,
  SOUND_LAB_PATTERN_COUNT,
  SOUND_LAB_SECTION_IDS,
  type SoundLabGuideEntry,
} from "~/data/dev/soundLabFixture";
import { getTabStore, useTabStore } from "~/stores/TabStore";
import { DEFAULT_TUNING } from "~/utils/tunings";

function parseCapo(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const capo = raw === undefined ? 0 : Number(raw);
  if (!Number.isInteger(capo) || capo < 0 || capo > 12) return 0;
  return capo;
}

function DevSoundLab() {
  const { query, isReady } = useRouter();
  const capo = parseCapo(query.capo);
  const [guide, setGuide] = useState<SoundLabGuideEntry[] | null>(null);
  const [forceCloseSectionAccordions, setForceCloseSectionAccordions] =
    useState(false);

  const snapshot = useTabStore((state) => ({
    editing: state.editing,
    showingAudioControls: state.showingAudioControls,
    firstSectionId: state.tabData[0]?.id,
    bpm: state.bpm,
    capo: state.capo,
    chordCount: state.chords.length,
    patternCount: state.strummingPatterns.length,
  }));

  useAutoCompileChords();
  useSpacebarAudioControl({ useHoveredChordLocation: true });
  const sectionIds = useSectionIds();

  const ready =
    snapshot.editing &&
    snapshot.showingAudioControls &&
    snapshot.firstSectionId === SOUND_LAB_SECTION_IDS.sectionRepeat &&
    snapshot.bpm === SOUND_LAB_BPM &&
    snapshot.capo === capo &&
    snapshot.chordCount === SOUND_LAB_CHORD_COUNT &&
    snapshot.patternCount === SOUND_LAB_PATTERN_COUNT;

  useEffect(() => {
    if (!isReady) return;

    const state = getTabStore();
    const hydrated =
      state.editing &&
      state.showingAudioControls &&
      state.tabData[0]?.id === SOUND_LAB_SECTION_IDS.sectionRepeat &&
      state.bpm === SOUND_LAB_BPM &&
      state.capo === capo &&
      state.chords.length === SOUND_LAB_CHORD_COUNT &&
      state.strummingPatterns.length === SOUND_LAB_PATTERN_COUNT;

    if (hydrated) {
      setGuide((current) => current ?? createVerifiedSoundLab().guide);
      return;
    }

    const lab = createVerifiedSoundLab();
    const store = getTabStore();
    store.setEditing(true);
    store.setShowingAudioControls(true);
    store.setId(-1);
    store.setTitle("Sound lab");
    store.setDescription(
      "Dev-only fixture for checking note, chord, and section playback.",
    );
    store.setTuning(DEFAULT_TUNING);
    store.setBpm(SOUND_LAB_BPM);
    store.setCapo(capo);
    store.setChords(structuredClone(lab.chords));
    store.setStrummingPatterns(structuredClone(lab.strummingPatterns));
    store.setSectionProgression(structuredClone(lab.sectionProgression));
    store.setTabData((draft) => {
      draft.splice(0, draft.length, ...structuredClone(lab.tabData));
    });
    setGuide(lab.guide);
  }, [isReady, capo, snapshot]);

  return (
    <div
      id="devSoundLab"
      data-ready={ready ? "true" : "false"}
      className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-[85%] md:p-0 xl:w-[70%]"
    >
      <Head>
        <title>Sound lab | Autostrum</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="baseVertFlex w-full !items-start gap-4 px-4 md:px-0">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Sound lab
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-foreground/80">
          Every section below is a real tab played by the editor. Use a
          section&apos;s play button to hear just that group. The transport at
          the bottom plays the current scope; before any section is selected
          that scope is the whole lab, which starts by repeating section 1
          twice. After a section play, choose Play whole tab to clear the
          scope. Add <span className="font-medium">?capo=2</span> (0–12) to
          shift every fret. Nothing on this page can be published.
        </p>

        {guide && (
          <details open className="w-full max-w-3xl rounded-md border bg-background p-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              What each section is for
            </summary>
            <ol className="mt-3 flex list-decimal flex-col gap-3 pl-5">
              {guide.map((entry, index) => (
                <li key={entry.id}>
                  <a
                    href={`#sectionIndex${index}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {entry.title}
                  </a>
                  <ol className="mt-1 list-decimal pl-5 text-foreground/80">
                    {entry.hears.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>

      {ready && guide && (
        <div className="baseVertFlex mt-8 w-full gap-4">
          <Chords />
          <StrummingPatterns />
          {sectionIds.map((sectionId, index) => (
            <div key={sectionId} className="w-full">
              <SectionContainer
                sectionIndex={index}
                forceCloseSectionAccordions={forceCloseSectionAccordions}
                setForceCloseSectionAccordions={
                  setForceCloseSectionAccordions
                }
                tabDataLength={sectionIds.length}
              />
            </div>
          ))}
          {snapshot.showingAudioControls && <AudioControls />}
        </div>
      )}
    </div>
  );
}

export default function DevSoundLabPage() {
  if (process.env.NODE_ENV === "production") {
    return <ErrorPage statusCode={404} />;
  }

  return <DevSoundLab />;
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === "production") {
    return { notFound: true };
  }

  // Fail the dev request if a phrase no longer compiles into the effect it
  // claims to cover. Safe here: module init has finished.
  createVerifiedSoundLab();

  return { props: {} };
};
