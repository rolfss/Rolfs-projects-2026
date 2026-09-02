export { BUILD_INFO, SOURCES } from "./data-sources.mjs";
export { INTENTS, SUGGESTED_QUESTIONS, TOPICS } from "./data-reference.mjs";

import { RECORDS_1 } from "./data-records-1.mjs";
import { RECORDS_2 } from "./data-records-2.mjs";
import { RECORDS_3 } from "./data-records-3.mjs";
import { RECORDS_4 } from "./data-records-4.mjs";

export const RECORDS = Object.freeze([
  ...RECORDS_1,
  ...RECORDS_2,
  ...RECORDS_3,
  ...RECORDS_4,
]);
