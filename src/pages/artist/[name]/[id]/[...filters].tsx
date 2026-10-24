import type { GetServerSideProps } from "next";
import ArtistProfile from "~/components/Artist/ArtistProfile";

function ArtistProfileWithoutId() {
  return <ArtistProfile uniqueKey="artistProfileWithId" />;
}

export default ArtistProfileWithoutId;

// Resolve route names and URLs in the initial metadata returned to crawlers.
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});
