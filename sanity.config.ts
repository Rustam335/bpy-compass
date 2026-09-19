"use client";

import { codeInput } from "@sanity/code-input";
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schemaTypes";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

export default defineConfig({
  name: "bpy-compass",
  title: "bpy-compass",
  projectId,
  dataset,
  basePath: "/studio",
  plugins: [structureTool(), visionTool(), codeInput()],
  schema: { types: schemaTypes },
});
