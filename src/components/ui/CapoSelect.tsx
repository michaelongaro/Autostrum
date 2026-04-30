import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTabStore } from "~/stores/TabStore";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";

type CapoSelectProps = {
  triggerClassName?: string;
};

const capoOptions = Array.from({ length: 13 }, (_, fret) => ({
  value: fret.toString(),
  label: fret === 0 ? "None" : `${getOrdinalSuffix(fret)} fret`,
}));

function CapoSelect({ triggerClassName = "w-[110px]" }: CapoSelectProps) {
  const { capo, setCapo } = useTabStore((state) => ({
    capo: state.capo,
    setCapo: state.setCapo,
  }));

  return (
    <Select
      value={capo.toString()}
      onValueChange={(value) => {
        setCapo(Number(value));
      }}
    >
      <SelectTrigger id="capo" className={`h-10 ${triggerClassName}`}>
        <SelectValue placeholder="None" />
      </SelectTrigger>

      <SelectContent>
        {capoOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default CapoSelect;
