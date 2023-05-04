import { useState } from "react";
import type { Tab } from "@prisma/client";
import { useClerk, useAuth } from "@clerk/nextjs";
import TabMetadata from "./TabMetadata";
import TabSection from "./TabSection";

// not sure of best way to avoid having the same name for interface and component
export interface ITabSection {
  title: string;
  data: string[][];
}

function Tab({ tab }: { tab: Tab | undefined | null }) {
  const { user, loaded } = useClerk();
  const { userId, isLoaded } = useAuth();

  const [editing, setEditing] = useState(true);

  const [title, setTitle] = useState(tab?.title ?? "");
  const [description, setDescription] = useState(tab?.description ?? "");

  // these two will need some more coddling to get working
  const [genre, setGenre] = useState(tab?.genreId ?? 0);
  const [tuning, setTuning] = useState(tab?.tuning ?? "EADGBE"); // not sure how we want to handle this yet

  const [BPM, setBPM] = useState(tab?.bpm ?? 75);
  const [timeSignature, setTimeSignature] = useState(
    tab?.timeSignature ?? "4/4"
  );
  const [tabData, setTabData] = useState<ITabSection[]>(
    // @ts-expect-error asdf
    tab?.tabData ?? [
      {
        title: "Intro",
        data: [
          ["", "", "", "", "", "", "2", ""],
          ["", "", "", "", "", "", "", ""],
          ["", "", "", "", "", "", "2", ""],
          ["", "", "", "", "", "", "", ""],
          ["", "", "", "", "", "", "2", ""],
          ["", "", "", "", "", "", "", ""],
          ["", "", "", "1", "", "", "", ""],
          ["", "", "", "", "", "", "", ""],
        ],
      },
    ]
  );

  // tabData.map((section) => {
  //   section.data.map((column) => {
  //     column.map((note) => {
  //       console.log(note);
  //     });
  //   });
  // });

  // console.log(tab ? tab.tabData : [], user.);

  // <input
  //   type="text"
  //   name="title"
  //   id="title"
  //   value={title}
  //   onChange={(e) => setTitle(e.target.value)}
  // />;

  // TODO: validation + sanitization for inputs and also note effects for both mobile and desktop

  // edit/save buttons prob right at the top of this markup below
  return (
    <div className="baseVertFlex lightGlassmorphic mt-24 w-11/12 gap-4 rounded-md p-4 md:w-8/12">
      <TabMetadata
        editing={editing}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        genre={genre}
        setGenre={setGenre}
        tuning={tuning}
        setTuning={setTuning}
        BPM={BPM}
        setBPM={setBPM}
        timeSignature={timeSignature}
        setTimeSignature={setTimeSignature}
      />

      {/* Actual tab below */}
      {tabData.map((section, index) => (
        <TabSection
          key={index}
          tuning={tuning}
          sectionData={{
            title: section.title,
            data: section.data,
          }}
          setTabData={setTabData}
          sectionIndex={index}
          editing={editing}
        />
      ))}
    </div>
  );
}

export default Tab;
