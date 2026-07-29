#!/usr/bin/env node

import {readFile} from "node:fs/promises";
import {stdin} from "node:process";
import {buildReviewProposal} from "../src/proposal.mjs";

const inputIndex = process.argv.indexOf("--input");
const inputPath = inputIndex >= 0 ? process.argv[inputIndex + 1] : null;
const body = inputPath
  ? await readFile(inputPath, "utf8")
  : await new Promise((resolve, reject) => {
      let value = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => { value += chunk; });
      stdin.on("end", () => resolve(value));
      stdin.on("error", reject);
    });

const proposal = buildReviewProposal(JSON.parse(body));
process.stdout.write(`${JSON.stringify(proposal, null, 2)}\n`);
