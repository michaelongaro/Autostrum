// I believe I am declaring this globally, but I changed the clerk typings
// so prob have to use patch-package in prod

declare interface UserMetadata {
  likedTabIds: number[] | undefined;
  totalLikes: number | undefined;
  totalTabs: number | undefined;
  pinnedTabId: number | undefined;
  status: string | undefined;
}
