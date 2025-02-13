import { BiErrorCircle } from "react-icons/bi";

function Render404Page() {
  return (
    <div className="lightestGlassmorphic baseVertFlex mt-4 gap-2 rounded-md px-8 py-4">
      <div className="baseFlex gap-4 text-2xl font-bold">
        <div className="baseFlex gap-2">
          <BiErrorCircle className="h-8 w-8" /> Search error
        </div>
      </div>
      <div className="text-lg">Unable to load search results.</div>
      <div className="mt-4">
        Please check your URL for any typos and try again.
      </div>
    </div>
  );
}

export default Render404Page;
