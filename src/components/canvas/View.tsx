"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { View as ViewImpl } from "@react-three/drei";
import { Three } from "~/helpers/components/Three";

const View = forwardRef(({ children, ...props }, ref) => {
  const localRef = useRef(null);
  useImperativeHandle(ref, () => localRef.current);

  return (
    <>
      <div ref={localRef} {...props} />
      <Three>
        <ViewImpl track={localRef}>{children}</ViewImpl>
      </Three>
    </>
  );
});
View.displayName = "View";

export { View };
