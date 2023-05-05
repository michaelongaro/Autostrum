import { useState } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabColumn from "./TabColumn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { IoClose } from "react-icons/io5";

interface TabSection {
  sectionData: {
    title: string;
    data: string[][];
  };
  sectionIndex: number;
}

function TabSection({ sectionData, sectionIndex }: TabSection) {
  const [sectionTitle, setSectionTitle] = useState(sectionData.title);

  const {
    tuning,
    addingNewPalmMuteSection,
    setAddingNewPalmMuteSection,
    tabData,
    setTabData,
    editing,
  } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      addingNewPalmMuteSection: state.addingNewPalmMuteSection,
      setAddingNewPalmMuteSection: state.setAddingNewPalmMuteSection,
      tabData: state.tabData,
      setTabData: state.setTabData,
      editing: state.editing,
    }),
    shallow
  );

  // should these functions below be in zustand?
  function updateSectionTitle(e: React.ChangeEvent<HTMLInputElement>) {
    setSectionTitle(e.target.value);
    // pretty sure this is still necessary because zustand state is immutable I think
    const newTabData = [...tabData];
    newTabData[sectionIndex]!.title = e.target.value;

    setTabData(newTabData);
  }

  function addNewColumns() {
    const newTabData = [...tabData];

    for (let i = 0; i < 8; i++) {
      newTabData[sectionIndex]!.data.push(Array.from({ length: 8 }, () => ""));
    }

    setTabData(newTabData);
  }

  function generateNewColumns() {
    const baseArray = [];
    for (let i = 0; i < 8; i++) {
      baseArray.push(Array.from({ length: 8 }, () => ""));
    }

    return baseArray;
  }

  function addNewSection() {
    const newTabData = [...tabData];
    newTabData.splice(sectionIndex + 1, 0, {
      title: "New section",
      data: generateNewColumns(),
    });

    setTabData(newTabData);
  }

  return (
    // grid for dark backdrop?
    <div className="baseVertFlex relative h-full w-full !justify-start gap-4 md:p-8">
      <div className="absolute left-4 top-4">
        <Input value={sectionTitle} onChange={updateSectionTitle} />
      </div>

      <div className="baseFlex absolute left-4 top-16 gap-2 md:left-auto md:right-4 md:top-4">
        {/* logic for whether to disable up/down arrows */}
        <Button
          variant={"secondary"}
          className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
        >
          <BiUpArrowAlt className="h-5 w-5" />
        </Button>
        <Button
          variant={"secondary"}
          className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
        >
          <BiDownArrowAlt className="h-5 w-5" />
        </Button>
        <Button
          variant={"destructive"}
          className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
        >
          <IoClose className="h-5 w-5" />
        </Button>
      </div>

      <div className="baseFlex mt-48 w-full !justify-start md:mt-24">
        <div className="baseVertFlex relative gap-6 rounded-l-2xl border-2 border-pink-50 p-2">
          <div className="absolute left-0 top-[-7rem] w-[194px]">
            <Button
              onClick={() => {
                setAddingNewPalmMuteSection(!addingNewPalmMuteSection);
              }}
            >
              {addingNewPalmMuteSection ? "x" : "Add palm mute section +"}
            </Button>
          </div>

          {/* not sure format that is coming in but need to split better to show sharps and flats */}
          {tuning.split("").map((note, index) => (
            <div key={index}>{note}</div>
          ))}
        </div>

        {sectionData.data.map((column, index) => (
          <TabColumn
            key={index}
            columnData={column}
            sectionIndex={sectionIndex}
            columnIndex={index}
          />
        ))}

        {/* any way to not have to hardcode this? */}
        <div className="baseVertFlex h-[284px] rounded-r-2xl border-2 border-pink-50 p-1"></div>

        {/* also add "repeat" button so that it will show a "x2" or "x5" or w/e
            based on what multiplier the user typed */}

        <Button className="ml-4 rounded-full" onClick={addNewColumns}>
          +
        </Button>
      </div>

      <Button onClick={addNewSection}>Add section +</Button>
    </div>
  );
}

export default TabSection;
