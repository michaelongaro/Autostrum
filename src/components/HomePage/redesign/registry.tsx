import type { ComponentType } from "react";
import AtmosphericStudio from "./variations/AtmosphericStudio";
import ComposeForward from "./variations/ComposeForward";
import DarkMapleNight from "./variations/DarkMapleNight";
import LibraryExplore from "./variations/LibraryExplore";
import MinimalUtility from "./variations/MinimalUtility";
import PracticeForward from "./variations/PracticeForward";
import ProductDemoHero from "./variations/ProductDemoHero";
import SocialCreator from "./variations/SocialCreator";
import SplitNarrative from "./variations/SplitNarrative";
import ToolkitShowcase from "./variations/ToolkitShowcase";

export const VARIATION_COMPONENTS: Record<string, ComponentType> = {
  "product-demo": ProductDemoHero,
  "atmospheric-studio": AtmosphericStudio,
  "split-narrative": SplitNarrative,
  "compose-forward": ComposeForward,
  "practice-forward": PracticeForward,
  "library-explore": LibraryExplore,
  "dark-maple-night": DarkMapleNight,
  "minimal-utility": MinimalUtility,
  "toolkit-showcase": ToolkitShowcase,
  "social-creator": SocialCreator,
};
