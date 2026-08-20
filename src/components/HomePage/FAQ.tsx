import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Separator } from "~/components/ui/separator";

function FAQ() {
  return (
    <section className="baseVertFlex w-full max-w-[650px] gap-4 px-4 md:px-6 lg:px-8">
      <div className="baseVertFlex w-full max-w-2xl !items-start">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">FAQ</h2>
      </div>

      <Accordion
        type="single"
        collapsible
        className="baseVertFlex w-full !items-start gap-4 rounded-md"
      >
        <AccordionItem value="muteSwitch" className="w-full">
          <AccordionTrigger
            forFAQ={true}
            showUnderline={false}
            className="baseFlex !items-start !justify-between gap-8 text-left"
          >
            Why can&apos;t I hear any sounds playing on my iPhone?
          </AccordionTrigger>
          <AccordionContent className="my-2 w-full text-sm text-foreground/75">
            This is most likely caused by your iPhone&apos;s mute switch being
            turned on. Apple prevents any programmatic audio from playing on the
            web when this switch is turned on, please flip it off if you would
            like to practice along with our realistic guitar audio-samples.
          </AccordionContent>
        </AccordionItem>

        <Separator className="h-px bg-foreground/50" />

        <AccordionItem value="subscription" className="w-full">
          <AccordionTrigger
            forFAQ={true}
            showUnderline={false}
            className="baseFlex !items-start !justify-between gap-8 text-left"
          >
            Will Autostrum ever have any ads or a premium subscription?
          </AccordionTrigger>
          <AccordionContent className="my-2 w-full text-sm text-foreground/75">
            We have never had the intention of running ads or offering a premium
            subscription on our platform, however if hosting costs run too high
            then it&apos;s possible these might be implemented.
          </AccordionContent>
        </AccordionItem>

        <Separator className="h-px bg-foreground/50" />

        <AccordionItem value="missingEditorEffects" className="w-full">
          <AccordionTrigger
            forFAQ={true}
            showUnderline={false}
            className="baseFlex !items-start !justify-between gap-8 text-left"
          >
            There are some missing guitar effects that I want to include in my
            tab.
          </AccordionTrigger>
          <AccordionContent className="my-2 w-full text-sm text-foreground/75">
            We recognize that there are a handful of effects that are not
            currently supported (precise bends, harmonics, tapping, certain note
            lengths). This is because we value the ease of making a tab very
            highly, and want to get the ergonomics right so tab creators have a
            predicable experience. These features are planned to be added to the
            platform.
          </AccordionContent>
        </AccordionItem>

        <Separator className="h-px bg-foreground/50" />

        <AccordionItem value="autostrumApp" className="w-full">
          <AccordionTrigger
            forFAQ={true}
            showUnderline={false}
            className="baeFlex gap-8!items-start !justify-between text-left"
          >
            Where can I download the Autostrum app?
          </AccordionTrigger>
          <AccordionContent className="my-2 w-full text-sm text-foreground/75">
            Currently Autostrum exists solely as a web application, however we
            are open to app development if there is enough demand.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

export default FAQ;
