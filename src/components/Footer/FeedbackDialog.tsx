"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Bug, Check, Lightbulb } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import Spinner from "~/components/ui/Spinner";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import {
  FEEDBACK_MAX_LENGTH,
  feedbackInputSchema,
  type FeedbackCategory,
} from "~/utils/feedback";
import { LuVote } from "react-icons/lu";

const categories = [
  { value: "FEATURE_REQUEST", label: "Feature request" },
  { value: "BUG", label: "Bug" },
  { value: "OTHER", label: "Other" },
] satisfies { value: FeedbackCategory; label: string }[];

function AnimatedFeedbackError({
  message,
  id,
  className,
}: {
  message: string | null;
  id?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="error"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <FieldError id={id} className={className}>
            {message}
          </FieldError>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function FeedbackDialog() {
  const desktop = useViewportWidthBreakpoint(768);
  const reduceMotion = useReducedMotion();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("FEATURE_REQUEST");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const feedback = api.feedback.create.useMutation({ retry: false });

  const Root = desktop ? Dialog : Drawer;
  const Trigger = desktop ? DialogTrigger : DrawerTrigger;
  const Header = desktop ? DialogHeader : DrawerHeader;
  const Title = desktop ? DialogTitle : DrawerTitle;
  const Description = desktop ? DialogDescription : DrawerDescription;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && feedback.isSuccess) {
      feedback.reset();
      setMessage("");
      setCategory("FEATURE_REQUEST");
      setValidationError(null);
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedback.isLoading || feedback.isSuccess) return;

    const result = feedbackInputSchema.safeParse({ category, message });
    if (!result.success) {
      setValidationError(
        result.error.issues[0]?.message ?? "Please enter your feedback.",
      );
      return;
    }

    setValidationError(null);
    feedback.mutate(result.data);
  }

  const content = (
    <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-6">
      <Header className="gap-2 p-0 text-left">
        <Title>Share your feedback</Title>
        <Description>
          Have an idea or spotted a bug? Help make Autostrum better.
        </Description>
      </Header>

      <AnimatePresence mode="wait" initial={false}>
        {feedback.isSuccess ? (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="flex flex-col items-center gap-5 py-6 text-center"
          >
            <motion.div
              initial={reduceMotion ? false : { scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Check className="size-8" aria-hidden="true" />
            </motion.div>
            <div role="status" className="flex flex-col gap-2">
              <h3
                ref={(element) => element?.focus()}
                tabIndex={-1}
                className="text-lg font-semibold outline-none"
              >
                Thank you for your feedback
              </h3>
              <p className="text-sm text-foreground/75">
                We appreciate you taking the time to share your thoughts.
              </p>
            </div>
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={feedback.isLoading}
            initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="flex flex-col gap-6"
          >
            <FieldGroup>
              <Field
                data-disabled={feedback.isLoading}
                className="flex-row items-center gap-3"
              >
                <FieldLabel id={`${id}-type`}>Type</FieldLabel>
                <ToggleGroup
                  aria-labelledby={`${id}-type`}
                  value={[category]}
                  onValueChange={(values) => {
                    if (values[0]) setCategory(values[0]);
                  }}
                  disabled={feedback.isLoading}
                  className="flex items-center gap-2"
                >
                  {categories.map((item) => (
                    <Toggle
                      key={item.value}
                      value={item.value}
                      render={
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            category === item.value ? "default" : "outline"
                          }
                          className="h-8 gap-1.5 whitespace-nowrap px-2 sm:px-3"
                        />
                      }
                    >
                      {item.value === "FEATURE_REQUEST" ? (
                        <Lightbulb
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      ) : item.value === "BUG" ? (
                        <Bug className="size-3.5 shrink-0" aria-hidden="true" />
                      ) : null}
                      {item.label}
                    </Toggle>
                  ))}
                </ToggleGroup>
              </Field>

              <Field
                data-invalid={!!validationError}
                data-disabled={feedback.isLoading}
              >
                <FieldLabel htmlFor={`${id}-message`}>Content</FieldLabel>
                <Textarea
                  id={`${id}-message`}
                  name="message"
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setValidationError(null);
                  }}
                  placeholder={
                    category === "BUG"
                      ? "What happened, and what were you expecting? Steps to reproduce are helpful."
                      : "What would you like to share?"
                  }
                  className="h-36 min-h-24 resize-y"
                  maxLength={FEEDBACK_MAX_LENGTH}
                  required
                  disabled={feedback.isLoading}
                  aria-invalid={!!validationError}
                  aria-describedby={`${id}-hint${validationError ? ` ${id}-error` : ""}`}
                />
                <div>
                  <FieldDescription id={`${id}-hint`}>
                    {message.length.toLocaleString()} /{" "}
                    {FEEDBACK_MAX_LENGTH.toLocaleString()} characters
                  </FieldDescription>
                  <AnimatedFeedbackError
                    id={`${id}-error`}
                    message={validationError}
                    className="pt-2"
                  />
                </div>
              </Field>
            </FieldGroup>

            <div>
              <AnimatedFeedbackError
                message={
                  feedback.isError
                    ? "We couldn't send your feedback. Please try again later."
                    : null
                }
                className="pb-6"
              />
              <div className="flex flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={feedback.isLoading}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={feedback.isLoading || !message.trim()}
                  aria-label={feedback.isLoading ? "Sending…" : "Send feedback"}
                  className="w-36 shrink-0 overflow-hidden"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={feedback.isLoading ? "sending" : "send"}
                      initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                      transition={{ duration: reduceMotion ? 0 : 0.15 }}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap"
                      aria-hidden="true"
                    >
                      {feedback.isLoading ? (
                        <>
                          Sending…
                          <Spinner className="size-4" />
                        </>
                      ) : (
                        "Send feedback"
                      )}
                    </motion.span>
                  </AnimatePresence>
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <Root
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (feedback.isLoading && !nextOpen) {
          details.cancel();
          return;
        }
        handleOpenChange(nextOpen);
      }}
    >
      <Trigger render={<Button variant="link" className="gap-2" />}>
        <LuVote className="size-5" aria-hidden="true" />
        Feedback
      </Trigger>
      {desktop ? (
        <DialogContent
          className="max-h-[85dvh] overflow-hidden p-0 motion-reduce:transition-none"
          renderCloseButton={!feedback.isLoading}
        >
          {content}
        </DialogContent>
      ) : (
        <DrawerContent>{content}</DrawerContent>
      )}
    </Root>
  );
}
