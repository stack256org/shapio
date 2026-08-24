"use client";

import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

// Password field with a show/hide toggle, built on the shared InputGroup so it
// matches every other trailing-icon input (e.g. SearchInput) instead of a
// one-off style.
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupInput>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className={className}>
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((prev) => !prev)}
          size="icon-xs"
        >
          {visible ? <EyeSlashIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
