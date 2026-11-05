import type * as React from "react";

// Styled wrappers expose string classes; Base UI's render prop remains available.
export type StyledProps<T extends React.ElementType> = Omit<
  React.ComponentPropsWithRef<T>,
  "className"
> & { className?: string };
