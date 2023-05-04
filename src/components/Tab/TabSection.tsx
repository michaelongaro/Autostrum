import { useState } from "react";
import { type ITabSection } from "./Tab";
import TabColumn from "./TabColumn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { IoClose } from "react-icons/io5";

interface TabSection {
  tuning: string;
  sectionData: {
    title: string;
    data: string[][];
  };
  setTabData: React.Dispatch<React.SetStateAction<ITabSection[]>>;
  sectionIndex: number;
  editing: boolean;
}

function TabSection({
  tuning,
  sectionData,
  setTabData,
  sectionIndex,
  editing,
}: TabSection) {
  const [sectionTitle, setSectionTitle] = useState(sectionData.title);
  const [addingNewPalmMuteSection, setAddingNewPalmMuteSection] =
    useState(false);
  const [newPalmMuteLocation, setNewPalmMuteLocation] = useState<
    [number, number]
  >([-1, -1]);
  // TODO: move everything to zustand store soon

  function updateSectionTitle(e: React.ChangeEvent<HTMLInputElement>) {
    setSectionTitle(e.target.value);
    setTabData((prevTabData) => {
      const newTabData = [...prevTabData];
      newTabData[sectionIndex]!.title = e.target.value;
      return newTabData;
    });
  }

  function addNewColumns() {
    setTabData((prevTabData) => {
      const newTabData = [...prevTabData];

      for (let i = 0; i < 8; i++) {
        newTabData[sectionIndex]!.data.push(
          Array.from({ length: 8 }, () => "")
        );
      }

      return newTabData;
    });
  }

  function generateNewColumns() {
    const baseArray = [];
    for (let i = 0; i < 8; i++) {
      baseArray.push(Array.from({ length: 8 }, () => ""));
    }

    return baseArray;
  }

  function addNewSection() {
    setTabData((prevTabData) => {
      const newTabData = [...prevTabData];
      newTabData.splice(sectionIndex + 1, 0, {
        title: "New section",
        data: generateNewColumns(),
      });
      return newTabData;
    });
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
                setAddingNewPalmMuteSection((prev) => !prev);
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
            setTabData={setTabData}
            sectionIndex={sectionIndex}
            columnIndex={index}
            editing={editing}
            addingNewPalmMuteSection={addingNewPalmMuteSection}
            setAddingNewPalmMuteSection={setAddingNewPalmMuteSection}
            newPalmMuteLocation={newPalmMuteLocation}
            setNewPalmMuteLocation={setNewPalmMuteLocation}
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
