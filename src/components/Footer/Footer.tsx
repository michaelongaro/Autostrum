import { Button } from "~/components/ui/button";
import { MdOutlineMailOutline } from "react-icons/md";

function Footer() {
  return (
    <footer className="heavyGlassmorphic baseFlex z-30 h-16 w-full shadow-sm">
      <Button variant={"ghost"} asChild>
        <a
          href="mailto:michael.ongaro.dev@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          className="baseFlex gap-2"
        >
          <MdOutlineMailOutline className="h-6 w-6" />
          <p>Contact</p>
        </a>
      </Button>
    </footer>
  );
}

export default Footer;
