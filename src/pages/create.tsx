import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "~/components/Layout/Layout";
import tunings, { standard, parse } from "react-guitar-tunings";
import { motion } from "framer-motion";
// import useSound, { withSoundFont, withSamples } from "react-guitar-sound";

import useSound from "~/hooks/useSound/useSound";
import Tab from "~/components/Tab/Tab";

const test = parse("E2 A2 D3 G3 B3 E4");
// console.log(tunings);

// fyi I think we were still planning on adding the above/below effects
// into the tab here, need handling inside hook for this.

// oh DANG well this is interesting... if we actually do want to do the audio effected notes
// then we sorta need to combine the effect + note into one string right?

// ^^ gets murky if you are talking about a 4/6\3 type scneario hmmm
const tab = [
  [-1, -1, -1, -1, 8, -1],
  [-1, -1, -1, 7, -1, -1],
  [-1, -1, 5, -1, -1, -1],
  [-1, -1, -1, -1, 8, -1],
  [-1, -1, -1, 7, -1, -1],
  [-1, -1, 5, -1, -1, -1],
  [-1, -1, -1, -1, 8, -1],
  [-1, -1, -1, 7, -1, -1],
  [-1, -1, 5, -1, -1, -1],
  [-1, -1, -1, -1, 8, -1],
  [-1, -1, -1, 7, -1, -1],
  [-1, -1, 5, -1, -1, -1],

  [-1, -1, -1, -1, -1, 6],
  [-1, -1, -1, 7, -1, -1],
  [-1, -1, 5, -1, -1, -1],
  [-1, -1, -1, -1, -1, 6],
  [-1, -1, -1, 7, -1, -1],
  [-1, -1, 5, -1, -1, -1],
  [-1, -1, -1, -1, -1, 6],
  [-1, -1, -1, 7, -1, -1],
  [-1, -1, 5, -1, -1, -1],
  [-1, -1, -1, -1, -1, 6],
  [-1, -1, -1, -1, 8, -1],
  [-1, -1, 5, -1, -1, -1],
];

interface TabMetadata {
  title: string;
  description: string;
  createdAt: Date;
  genre: string;
  bpm: number;
  timing: string | null;
  tuning: string;
  tabData: string[][];
}

// ideally want this to be Tab instead of Create

// JSON interpretation:

function Create() {
  const { playTab } = useSound({
    tabData: tab,
    tuning: test,
  });

  // def need bpm and the when value will depend on the bpm

  // ^^ also technically would need to stop note sound when "shifting hand position"
  // across fretboard but that seems like a job for later

  // remember that high e is 0 and low e is 5

  // const hello = useCallback(() => {
  //   playTab();
  // }, [playTab]);

  // useEffect(() => {
  //   setTimeout(() => {
  //     hello();
  //   }, 5000);
  // }, [hello]);

  return (
    <motion.div
      key={"create"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <Tab tab={undefined} />
    </motion.div>
  );
}

export default Create;
