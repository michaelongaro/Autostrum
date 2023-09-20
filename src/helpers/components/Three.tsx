"use client";

import type { ReactNode } from "react";
import { r3f } from "~/helpers/global";

interface Three {
  children: ReactNode;
}

export const Three = ({ children }: Three) => {
  return <r3f.In>{children}</r3f.In>;
};
