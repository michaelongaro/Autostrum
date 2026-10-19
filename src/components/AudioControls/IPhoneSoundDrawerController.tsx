import dynamic from "next/dynamic";
import { useIPhoneSoundDrawerStore } from "~/stores/IPhoneSoundDrawerStore";

const IPhoneSoundDrawer = dynamic(() => import("./IPhoneSoundDrawer"), {
  ssr: false,
});

export default function IPhoneSoundDrawerController() {
  const hasOpened = useIPhoneSoundDrawerStore((state) => state.hasOpened);

  return hasOpened ? <IPhoneSoundDrawer /> : null;
}
