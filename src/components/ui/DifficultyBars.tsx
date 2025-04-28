function DifficultyBars({ difficulty }: { difficulty: number }) {
  const difficultyBars = Array.from({ length: 5 }, (_, i) => (
    <DifficultyBar key={i} filled={i < difficulty} />
  ));

  return <div className="baseFlex !items-end gap-0.5">{difficultyBars}</div>;
}

function DifficultyBar({ filled }: { filled: boolean }) {
  return (
    <div
      className={`h-[14px] w-[3px] rounded-full bg-pink-200 ${filled ? "" : "opacity-50"}`}
    ></div>
  );
}

export default DifficultyBars;
