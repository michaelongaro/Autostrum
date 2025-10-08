import Link from "next/link";
import { MdOutlineMailOutline } from "react-icons/md";
import { Button } from "~/components/ui/button";
import { FaGithub } from "react-icons/fa";
import { Separator } from "~/components/ui/separator";

function Footer() {
  return (
    <footer
      style={{
        boxShadow:
          "0 -4px 6px -1px hsl(var(--primary) / 0.1), 0 -2px 4px -2px hsl(var(--primary) / 0.2)",
      }}
      className="baseFlex z-20 h-16 w-full gap-2 bg-header xs:gap-4"
    >
      <Button variant={"link"} asChild>
        <a
          href="mailto:michael.ongaro.dev@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          className="baseFlex gap-2"
        >
          <MdOutlineMailOutline className="size-5" />
          <span>Contact</span>
        </a>
      </Button>

      <Separator
        orientation="vertical"
        className="h-4 w-[1px] bg-foreground/50"
      />

      <Button variant={"link"} asChild>
        <Link prefetch={false} href={"/privacy"}>
          Privacy Policy
        </Link>
      </Button>

      <Separator
        orientation="vertical"
        className="h-4 w-[1px] bg-foreground/50"
      />

      <Button variant={"link"} asChild>
        <a
          href="https://github.com/michaelongaro/Autostrum"
          target="_blank"
          rel="noopener noreferrer"
          className="baseFlex gap-2"
        >
          <FaGithub className="size-5" />
          <span>GitHub</span>
        </a>
      </Button>
    </footer>
  );
}

export default Footer;
