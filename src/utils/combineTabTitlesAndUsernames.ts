export default function combineTabTitlesAndUsernamess(
  tabTitles: string[],
  usernames: string[]
) {
  const maxLength = 6;
  let res = [];

  // If one of the arrays is empty or can fill the result array by itself
  if (tabTitles.length >= maxLength) {
    return tabTitles
      .slice(0, maxLength)
      .map((element) => ({ value: element, type: "title" }));
  }
  if (usernames.length >= maxLength) {
    return usernames
      .slice(0, maxLength)
      .map((element) => ({ value: element, type: "username" }));
  }
  if (tabTitles.length === 0) {
    return usernames
      .slice(0, maxLength)
      .map((element) => ({ value: element, type: "username" }));
  }
  if (usernames.length === 0) {
    return tabTitles.map((element) => ({ value: element, type: "title" }));
  }

  // Determine the maximum amount of elements to take from each array
  const maxElemsFromEachArray = Math.ceil(maxLength / 2);

  // Determine how many elements to take from each array
  let elemsFromtabTitles =
    tabTitles.length <= maxElemsFromEachArray
      ? tabTitles.length
      : maxElemsFromEachArray;
  let elemsFromusernames = maxLength - elemsFromtabTitles;

  // If usernames does not have enough elements to fill the rest of the result array,
  // take more elements from tabTitles
  if (usernames.length < elemsFromusernames) {
    elemsFromtabTitles += elemsFromusernames - usernames.length;
    elemsFromusernames = usernames.length;
  }

  // Combine the arrays
  res = [
    ...tabTitles
      .slice(0, elemsFromtabTitles)
      .map((element) => ({ value: element, type: "title" })),
    ...usernames
      .slice(0, elemsFromusernames)
      .map((element) => ({ value: element, type: "username" })),
  ];

  return res;
}
