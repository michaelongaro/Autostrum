import type { ReactNode } from "react";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import StaticPalmMuteNode from "~/components/Tab/Static/StaticPalmMuteNode";
import { StaticPrintTabRow } from "~/components/Tab/Static/StaticTabSection";
import ChordStrumIcon from "~/components/ui/icons/ChordStrumIcon";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import type { ChordSequence } from "~/stores/TabStore";
import { generateBeatLabels } from "~/utils/getBeatIndicator";
import { beamBreaksForStrums } from "~/utils/noteLengthBeaming";
import { getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";
import {
  getPrintPageSize,
  getPrintProgression,
  getPrintSections,
  getPrintTabRows,
  printRepeatCount,
  printRepetitions,
  type PrintOptions,
  type PrintTabData,
} from "~/utils/printTab";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";
import { getDisplayTuningNotes } from "~/utils/tunings";

const STRUM_WIDTH = 52;

/** Keep chord colors recognizable and readable on white paper. */
function printChordColor(color: string | undefined, enabled: boolean) {
  if (!enabled || !color || !/^#[0-9a-f]{6}$/i.test(color)) return "#181818";
  let rgb = [1, 3, 5].map((start) =>
    parseInt(color.slice(start, start + 2), 16),
  );
  for (let attempt = 0; attempt < 20; attempt++) {
    const linear = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    if (
      linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722 <=
      0.183
    )
      break;
    rgb = rgb.map((channel) => Math.floor(channel * 0.9));
  }
  return `rgb(${rgb.join(", ")})`;
}

function PrintStrumRow({
  sequence,
  start,
  end,
  data,
  options,
}: {
  sequence: ChordSequence;
  start: number;
  end: number;
  data: PrintTabData;
  options: PrintOptions;
}) {
  const strums = sequence.strummingPattern.strums;
  const labels = generateBeatLabels(strums.map((strum) => strum.noteLength));
  const beams = beamBreaksForStrums(strums);
  const names: string[] = [];
  let current = "";
  for (const [index] of strums.entries()) {
    current = sequence.data[index] || current;
    names.push(current);
  }
  const labelHeight = Math.max(
    34,
    ...names
      .slice(start, end + 1)
      .map((name) => Math.ceil(name.length / 6) * 15 + 4),
  );
  return (
    <div className="print-strum-row" data-print-strum-row="">
      {strums.slice(start, end + 1).map((strum, offset) => {
        const index = start + offset;
        const name = names[index] ?? "";
        const color = printChordColor(
          data.chords.find((chord) => chord.name === name)?.color,
          options.colorChords,
        );
        return (
          <div
            key={index}
            className="print-strum"
            style={{ width: STRUM_WIDTH }}
          >
            <div className="print-palm-mute">
              <StaticPalmMuteNode value={strum.palmMute} />
            </div>
            <div
              className="print-chord-name"
              style={{ color, height: labelHeight }}
            >
              {index === start || sequence.data[index] ? name : ""}
            </div>
            <div className="print-strum-icon" style={{ color }}>
              <ChordStrumIcon effects={strum.strum} size={20} />
              {strum.strum.includes("s") && (
                <span className={strum.strum.includes(">") ? "font-bold" : ""}>
                  s
                </span>
              )}
              {strum.strum === "r" && <PauseIcon className="size-3" />}
              {strum.strum.includes(".") && (
                <span className="print-staccato">·</span>
              )}
            </div>
            <div className="print-beat">{labels[index]}</div>
            <div className="print-rhythm-guide relative h-4 w-full">
              {renderNoteLengthGuide({
                previousNoteLength: strums[index - 1]?.noteLength,
                currentNoteLength: strum.noteLength,
                nextNoteLength: strums[index + 1]?.noteLength,
                previousIsRestStrum: strums[index - 1]?.strum === "r",
                currentIsRestStrum: strum.strum === "r",
                nextIsRestStrum: strums[index + 1]?.strum === "r",
                color: "maple",
                theme: "light",
                isFirstInGroup: index === start,
                isLastInGroup: index === end,
                breakBeamWithPrevious:
                  index === start || (beams[index]?.breakWithPrevious ?? true),
                breakBeamWithNext:
                  index === end || (beams[index]?.breakWithNext ?? true),
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Small blocks let the preview and printer share the very same page breaks. */
export function buildPrintBlocks(
  data: PrintTabData,
  options: PrintOptions,
): ReactNode[] {
  const visits = getPrintSections(data, options);
  if (visits.length === 0) return [];
  const blocks: ReactNode[] = [];
  const { contentWidth } = getPrintPageSize(options);
  const musicWidth = contentWidth / options.scale;
  const expanded = options.layout === "expanded" && options.expandRepeats;
  let sectionTitle = "";
  const add = (node: ReactNode, keep = false, newPage = false) => {
    if (blocks.length >= 10000)
      throw new Error(
        "This printout is too large. Use the compact layout, turn off Expand all repeats, or select fewer sections.",
      );
    blocks.push(
      <div
        key={blocks.length}
        data-print-block=""
        data-keep-next={keep || undefined}
        data-new-page={newPage || undefined}
        data-section-title={sectionTitle}
      >
        {node}
      </div>,
    );
  };
  const music = (node: ReactNode) => (
    <div
      className="print-music"
      style={{ zoom: options.scale, width: musicWidth }}
    >
      {node}
    </div>
  );

  add(
    <header className="print-title">
      <h1>{data.title || "Untitled tab"}</h1>
      {data.artistName && <p className="print-artist">{data.artistName}</p>}
      <div className="print-metadata">
        <span>
          Tuning:{" "}
          {getDisplayTuningNotes(data.tuning)
            .map((note) =>
              note
                .replace(/\d+$/, "")
                .replace(/^[a-g]/i, (letter) => letter.toUpperCase())
                .replace(/b/g, "♭"),
            )
            .join(" ")}
        </span>
        <span>
          {data.bpm > 0 ? `${data.bpm} BPM` : "Tempo not set"} ·{" "}
          {data.capo > 0 ? `Capo ${data.capo}` : "No capo"}
          {data.key ? ` · ${data.key}` : ""}
        </span>
      </div>
    </header>,
    true,
  );

  if (options.description && data.description) {
    for (const paragraph of data.description.split("\n").filter(Boolean))
      add(<p className="print-description">{paragraph}</p>);
  }

  if (options.progression) {
    const progression = getPrintProgression(
      data.tabData,
      data.sectionProgression,
      options.sectionIds,
    );
    add(<h2 className="print-small-heading">Section progression</h2>, true);
    for (let index = 0; index < progression.length; index += 3) {
      add(
        <div className="print-progression-row">
          {progression
            .slice(index, index + 3)
            .map(({ section, repetitions }, offset) => (
              <div key={index + offset} className="print-progression-step">
                <span>{index + offset + 1}.</span> {section.title}
                {repetitions > 1 ? ` ×${repetitions}` : ""}
              </div>
            ))}
        </div>,
      );
    }
  }

  const usedNames = new Set(
    visits.flatMap(({ section }) =>
      section.data.flatMap((sub) =>
        sub.type === "chord"
          ? sub.data.flatMap((sequence) => sequence.data.filter(Boolean))
          : [],
      ),
    ),
  );
  const chords = data.chords.filter((chord) => usedNames.has(chord.name));
  if (options.chordDiagrams && chords.length > 0) {
    add(
      <h2 className="print-small-heading">
        Chord reference{options.leftHanded ? " · left-handed" : ""}
      </h2>,
      true,
    );
    const perRow = Math.max(1, Math.floor(musicWidth / 112));
    for (let index = 0; index < chords.length; index += perRow) {
      add(
        music(
          <div className="print-chord-diagrams">
            {chords.slice(index, index + perRow).map((chord) => (
              <div key={chord.id} className="print-chord-diagram">
                <strong
                  style={{
                    color: printChordColor(chord.color, options.colorChords),
                  }}
                >
                  {chord.name}
                </strong>
                <div>
                  <ChordDiagram
                    originalFrets={chord.frets}
                    leftHanded={options.leftHanded}
                  />
                </div>
              </div>
            ))}
          </div>,
        ),
      );
    }
  }

  visits.forEach(({ section, label }, visitIndex) => {
    sectionTitle = label;
    add(
      <h2 className="print-section-heading">
        {visitIndex + 1}. {label}
      </h2>,
      true,
      options.newPagePerSection && visitIndex > 0,
    );
    if (section.data.length === 0)
      add(<p className="print-empty">Empty section</p>);
    section.data.forEach((sub, subIndex) => {
      for (const subRepeat of printRepetitions(sub.repetitions, expanded)) {
        const subTempo = sub.bpm > 0 ? sub.bpm : data.bpm;
        add(
          <div className="print-subheading">
            {sub.type === "tab" ? "Tab" : "Chords"}{" "}
            {section.data.length > 1 ? subIndex + 1 : ""} ·{" "}
            {subTempo > 0 ? `${subTempo} BPM` : "Tempo not set"}
            {printRepeatCount(sub.repetitions) > 1 &&
              (expanded
                ? ` · Pass ${subRepeat + 1}/${printRepeatCount(sub.repetitions)}`
                : ` · Repeat ${printRepeatCount(sub.repetitions)}×`)}
          </div>,
          true,
        );
        if (sub.type === "tab") {
          const rows = getPrintTabRows(sub.data, musicWidth);
          if (rows.length === 0)
            add(<p className="print-empty">Empty tab block</p>);
          rows.forEach(({ start, end }) =>
            add(
              music(
                <StaticPrintTabRow
                  subSectionData={sub}
                  start={start}
                  end={end}
                  tuning={data.tuning}
                  bpm={data.bpm}
                />,
              ),
            ),
          );
        } else {
          if (sub.data.length === 0)
            add(<p className="print-empty">Empty chord block</p>);
          sub.data.forEach((sequence, sequenceIndex) => {
            for (const sequenceRepeat of printRepetitions(
              sequence.repetitions,
              expanded,
            )) {
              const tempo = sequence.bpm > 0 ? sequence.bpm : subTempo;
              add(
                <div className="print-sequence-heading">
                  Pattern {sequenceIndex + 1} ·{" "}
                  <span className="print-tempo">
                    {getDynamicNoteLengthIcon({
                      noteLength: sequence.strummingPattern.baseNoteLength,
                    })}{" "}
                    {tempo > 0 ? `${tempo} BPM` : "Tempo not set"}
                  </span>
                  {printRepeatCount(sequence.repetitions) > 1 &&
                    (expanded
                      ? ` · Pass ${sequenceRepeat + 1}/${printRepeatCount(sequence.repetitions)}`
                      : ` · Repeat ${printRepeatCount(sequence.repetitions)}×`)}
                </div>,
                true,
              );
              const perRow = Math.max(1, Math.floor(musicWidth / STRUM_WIDTH));
              if (sequence.strummingPattern.strums.length === 0)
                add(<p className="print-empty">Empty strumming pattern</p>);
              for (
                let start = 0;
                start < sequence.strummingPattern.strums.length;
                start += perRow
              ) {
                add(
                  music(
                    <PrintStrumRow
                      sequence={sequence}
                      start={start}
                      end={Math.min(
                        start + perRow - 1,
                        sequence.strummingPattern.strums.length - 1,
                      )}
                      data={data}
                      options={options}
                    />,
                  ),
                );
              }
            }
          });
        }
      }
    });
  });
  return blocks;
}
