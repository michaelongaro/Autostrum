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
import SectionContainer from "~/components/Tab/SectionContainer";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useSpacebarAudioControl from "~/hooks/useSpacebarAudioControl";
import { useSectionIds } from "~/hooks/useTabDataSelectors";
import {
  createVerifiedSoundLab,
  SOUND_LAB_BPM,
  SOUND_LAB_CHORD_COUNT,
  SOUND_LAB_PATTERN_COUNT,
  SOUND_LAB_SECTION_ID,
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
    snapshot.firstSectionId === SOUND_LAB_SECTION_ID &&
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
      state.tabData[0]?.id === SOUND_LAB_SECTION_ID &&
      state.bpm === SOUND_LAB_BPM &&
      state.capo === capo &&
      state.chords.length === SOUND_LAB_CHORD_COUNT &&
      state.strummingPatterns.length === SOUND_LAB_PATTERN_COUNT;

    if (hydrated) return;

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

      {ready && (
        <div className="baseVertFlex w-full gap-4">
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
