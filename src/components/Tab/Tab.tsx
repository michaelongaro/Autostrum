import { useState } from "react";
import type { Tab } from "@prisma/client";
import { useClerk, useAuth } from "@clerk/nextjs";

interface TabSection {
  title: string;
  data: string[][];
}

function Tab({ tab }: { tab: Tab | undefined | null }) {
  const { user, loaded } = useClerk();
  const { userId, isLoaded } = useAuth();

  const [title, setTitle] = useState(tab?.title ?? "");
  const [description, setDescription] = useState(tab?.description ?? "");
  const [bpm, setBpm] = useState(tab?.bpm ?? 75);
  const [tuning, setTuning] = useState(tab?.tuning ?? "standard"); // not sure how we want to handle this yet
  const [tabData, setTabData] = useState<TabSection[]>(
    // @ts-expect-error asdf
    tab?.tabData ?? []
  );

  // tabData.map((section) => {
  //   section.data.map((column) => {
  //     column.map((note) => {
  //       console.log(note);
  //     });
  //   });
  // });

  // console.log(tab ? tab.tabData : [], user.);

  return (
    <div className="baseVertFlex lightGlassmorphic md:w-8/12 w-11/12 gap-4 rounded-md p-4">
      <div className="baseFlex w-full gap-4">
        <div className="baseVertFlex w-1/2 gap-4">
          <div className="baseFlex w-full gap-4">
            <div className="baseVertFlex w-1/2 gap-4">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                name="title"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="baseVertFlex w-1/2 gap-4">
              <label htmlFor="description">Description</label>
              <input
                type="text"
                name="description"
                id="description"
                value={description ? description : ""}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="baseFlex w-full gap-4">
            <div className="baseVertFlex w-1/2 gap-4">
              <label htmlFor="bpm">BPM</label>
              <input
                type="number"
                name="bpm"
                id="bpm"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
              />
            </div>
            <div className="baseVertFlex w-1/2 gap-4">
              <label htmlFor="tuning">Tuning</label>
              <input
                type="text"
                name="tuning"
                id="tuning"
                value={tuning}
                onChange={(e) => setTuning(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tab;
