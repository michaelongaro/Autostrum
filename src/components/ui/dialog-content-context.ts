"use client";

import { createContext } from "react";

// Shared by dialogs and drawers, including selects rendered through portals.
export const DialogContentContext = createContext(false);
