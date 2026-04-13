import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { IoIosArrowBack } from "react-icons/io";

type ToolRouteHeaderProps = {
  title: string;
  description: string;
  icon: ReactNode;
};

function ToolRouteHeader({ title, description, icon }: ToolRouteHeaderProps) {
  return (
    <div className="baseVertFlex w-full !items-start gap-3">
      <Button variant="outline" asChild className="!h-8 pl-3 pr-4">
        <Link prefetch={false} href="/tools" className="baseFlex gap-2">
          <IoIosArrowBack className="mt-[1px]" />
          Tools
        </Link>
      </Button>

      <div className="baseFlex w-full !justify-start gap-2">
        {icon}
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>

      <p className="max-w-2xl text-sm text-foreground/85">{description}</p>
    </div>
  );
}

export default ToolRouteHeader;
