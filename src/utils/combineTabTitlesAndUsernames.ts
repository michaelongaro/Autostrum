interface combineTabTitlesAndUsernames {
  tabs: {
    title: string;
    genreId: number;
  }[];
  usernames: string[];
}

export default function combineTabTitlesAndUsernamess({
  tabs,
  usernames,
}: combineTabTitlesAndUsernames) {
  const maxLength = 6;
  let res = [];

  // If one of the arrays is empty or can fill the result array by itself
  if (tabs.length >= maxLength) {
    return tabs
      .slice(0, maxLength)
      .map((element) => ({ value: element, type: "title" }));
  }
  if (usernames.length >= maxLength) {
    return usernames
      .slice(0, maxLength)
      .map((element) => ({ value: element, type: "username" }));
  }
  if (tabs.length === 0) {
    return usernames
      .slice(0, maxLength)
      .map((element) => ({ value: element, type: "username" }));
  }
  if (usernames.length === 0) {
    return tabs.map((element) => ({ value: element, type: "title" }));
  }

  // Determine the maximum amount of elements to take from each array
  const maxElemsFromEachArray = Math.ceil(maxLength / 2);

  // Determine how many elements to take from each array
  let elemsFromtabs =
    tabs.length <= maxElemsFromEachArray ? tabs.length : maxElemsFromEachArray;
  let elemsFromusernames = maxLength - elemsFromtabs;

  // If usernames does not have enough elements to fill the rest of the result array,
  // take more elements from tabs
  if (usernames.length < elemsFromusernames) {
    elemsFromtabs += elemsFromusernames - usernames.length;
    elemsFromusernames = usernames.length;
  }

  // Combine the arrays
  res = [
    ...tabs.slice(0, elemsFromtabs).map((element) => ({
      value: { title: element.title, genreId: element.genreId },
      type: "title",
    })),
    ...usernames
      .slice(0, elemsFromusernames)
      .map((element) => ({ value: element, type: "username" })),
  ];

  return res;
}
