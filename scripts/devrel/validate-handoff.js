#!/usr/bin/env node
"use strict";

// Validates a milestone handoff YAML file (see devrel/templates/milestone.yml
// for the schema) before it's allowed to feed generate-drafts.js.
//
// Exports loadHandoff/validateHandoff/REPO_ROOT so generate-drafts.js can
// reuse the exact same parsing and validation instead of duplicating it -
// generate-drafts.js refuses to generate from a handoff that fails these
// same checks.
//
// Never writes or modifies any file; read-only by design.

const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNonEmptyStringArray(value) {
  return isStringArray(value) && value.length > 0;
}

function isTestEntry(entry) {
  return (
    entry !== null &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    isNonEmptyString(entry.command) &&
    isNonEmptyString(entry.result)
  );
}

function isNonEmptyTestArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isTestEntry);
}

// Loads and parses a handoff YAML file. Throws with a descriptive message on
// a missing file or invalid YAML; does not validate the schema itself.
function loadHandoff(handoffArg) {
  const handoffPath = path.resolve(process.cwd(), handoffArg);

  if (!fs.existsSync(handoffPath)) {
    throw new Error(`Handoff file not found: ${handoffPath}`);
  }

  const raw = fs.readFileSync(handoffPath, "utf8");
  let handoff;

  try {
    handoff = YAML.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse ${handoffPath} as YAML: ${error.message}`);
  }

  if (handoff === null || typeof handoff !== "object" || Array.isArray(handoff)) {
    throw new Error(`${handoffPath} must contain a single YAML mapping (object) at the top level.`);
  }

  return { handoff, handoffPath };
}

// Returns a list of human-readable error strings; an empty list means the
// handoff is valid. Field-shape checks only - callers decide what to do
// with the result (print and exit, or refuse to generate).
function validateHandoff(handoff) {
  const errors = [];

  const requireNonEmptyString = (field) => {
    if (!isNonEmptyString(handoff[field])) {
      errors.push(`"${field}" must be a non-empty string.`);
    }
  };

  const requireStringArray = (field) => {
    if (!isStringArray(handoff[field])) {
      errors.push(`"${field}" must be an array of strings (it may be empty).`);
    }
  };

  requireNonEmptyString("milestone_id");
  requireNonEmptyString("title");
  requireNonEmptyString("status");
  requireNonEmptyString("summary");

  if (!isNonEmptyString(handoff.date) || !DATE_PATTERN.test(handoff.date)) {
    errors.push('"date" must be a string in YYYY-MM-DD format.');
  }

  if (!isNonEmptyStringArray(handoff.implemented_features)) {
    errors.push('"implemented_features" must be a non-empty array of strings.');
  }

  requireStringArray("visible_user_facing_changes");
  requireStringArray("commands_added");

  if (!isNonEmptyTestArray(handoff.tests)) {
    errors.push(
      '"tests" must be a non-empty array of objects, each with a non-empty "command" and "result" string.'
    );
  }

  requireStringArray("approved_technical_decisions");
  requireStringArray("known_limitations");
  requireStringArray("screenshots");
  requireStringArray("videos");
  requireStringArray("commits_or_prs");

  // Media paths, if present, must exist relative to the repository root -
  // catches copy/paste placeholders and typos before they reach a draft.
  for (const field of ["screenshots", "videos"]) {
    const list = handoff[field];

    if (!Array.isArray(list)) {
      continue;
    }

    for (const relativePath of list) {
      if (typeof relativePath !== "string") {
        continue;
      }

      const absolutePath = path.resolve(REPO_ROOT, relativePath);

      if (!fs.existsSync(absolutePath)) {
        errors.push(`"${field}" entry "${relativePath}" does not exist (looked for ${absolutePath}).`);
      }
    }
  }

  return errors;
}

function main() {
  const handoffArg = process.argv[2];

  if (!handoffArg) {
    process.stderr.write("Usage: node scripts/devrel/validate-handoff.js <path-to-handoff.yml>\n");
    process.exitCode = 1;
    return;
  }

  let handoff;
  let handoffPath;

  try {
    ({ handoff, handoffPath } = loadHandoff(handoffArg));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  const errors = validateHandoff(handoff);

  if (errors.length > 0) {
    process.stderr.write(`${handoffPath} failed validation:\n`);
    for (const error of errors) {
      process.stderr.write(`  - ${error}\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${handoffPath} is valid.\n`);
}

if (require.main === module) {
  main();
}

module.exports = { loadHandoff, validateHandoff, REPO_ROOT };
