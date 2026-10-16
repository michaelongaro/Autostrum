import dynamic from "next/dynamic";
import { useIPhoneAudioReminderStore } from "~/stores/IPhoneAudioReminderStore";

const IPhoneSoundDrawer = dynamic(() => import("./IPhoneSoundDrawer"), {
  ssr: false,
});

export default function IPhoneSoundReminder() {
  const hasPrompted = useIPhoneAudioReminderStore((state) => state.hasPrompted);

  // Load the animation and Drawer only after an iPhone playback request.
  return hasPrompted ? <IPhoneSoundDrawer /> : null;
}
