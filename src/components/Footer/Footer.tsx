import Link from "next/link";
import { MdOutlineMailOutline } from "react-icons/md";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

function Footer() {
  return (
    <footer className="footerBackgroundGradient baseFlex z-30 h-16 w-full gap-4 shadow-sm">
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

      <Separator orientation="vertical" className="h-4" />

      <Button variant={"link"} asChild>
        <Link href={"/privacy"}>Privacy Policy</Link>
      </Button>
    </footer>
  );
}

export default Footer;
