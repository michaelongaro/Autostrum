import NotFoundContent from "~/components/errors/NotFoundContent";
import { createMetadata } from "~/utils/metadata";
export const metadata = createMetadata({
  title: "404 | Autostrum",
  description: "The page you are looking for could not be found on Autostrum.",
  noIndex: true,
});
export default NotFoundContent;
