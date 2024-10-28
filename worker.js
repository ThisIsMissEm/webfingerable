import { setTimeout } from "node:timers/promises";
export default async ({ domain }) => {
  console.log(">>", domain);
  await setTimeout(1000);

  return { domain, status: "available" };
};
