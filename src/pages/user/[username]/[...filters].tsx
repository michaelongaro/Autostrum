import type { GetServerSideProps } from "next";
import UserProfile from "~/components/User/UserProfile";

function ArtistProfileWithoutId() {
  return <UserProfile uniqueKey="userProfileWithoutId" />;
}

export default ArtistProfileWithoutId;

// Resolve route names and URLs in the initial metadata returned to crawlers.
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});
