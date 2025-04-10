import { Form, FormProps, SubmitOptions, useSubmit } from "@remix-run/react";
import { useRef } from "react";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { cn } from "~/lib/utils";

export const chatFormSchema = zfd.formData({
  text: zfd.text(z.string().min(1)),
});

export function ChatForm({
  navigate,
  fetcherKey,
  submitting,
}: {
  navigate?: boolean;
  fetcherKey?: string;
  submitting?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();
  const formProps: FormProps & SubmitOptions = {
    method: "post",
    navigate,
    fetcherKey,
    preventScrollReset: true,
  };

  return (
    <Form className="flex flex-col gap-4" ref={formRef} {...formProps}>
      <Textarea
        name="text"
        placeholder="How can I help you?"
        className="w-120 max-w-full resize-none"
        required
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();

            if (formRef.current) {
              submit(formRef.current, formProps);
            }
          }
        }}
      />
      <Button
        type="submit"
        className={cn([
          "self-end",
          submitting ? "cursor-progress" : "cursor-pointer",
        ])}
        disabled={submitting}
      >
        Submit
      </Button>
    </Form>
  );
}
