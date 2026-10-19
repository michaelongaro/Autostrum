import dynamic from "next/dynamic";
import { useIPhoneAudioReminderStore } from "~/stores/IPhoneAudioReminderStore";

const IPhoneSoundDrawer = dynamic(() => import("./IPhoneSoundDrawer"), {
  ssr: false,
});

export default function IPhoneSoundReminder() {
  const hasPrompted = useIPhoneAudioReminderStore((state) => state.hasPrompted);

  // Load troubleshooting only after playback recovery fails on an iPhone.
  return hasPrompted ? <IPhoneSoundDrawer /> : null;
}
