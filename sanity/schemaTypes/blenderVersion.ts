import { defineField, defineType } from "sanity";

export const blenderVersion = defineType({
  name: "blenderVersion",
  title: "Blender version",
  type: "document",
  fields: [
    defineField({
      name: "version",
      title: "Version",
      type: "string",
      description: 'Major.minor, e.g. "4.5"',
      validation: (r) => r.required().regex(/^\d+\.\d+$/, { name: "major.minor" }),
    }),
    defineField({ name: "releaseDate", title: "Release date", type: "date" }),
    defineField({ name: "lts", title: "LTS", type: "boolean", initialValue: false }),
    defineField({ name: "releaseNotesUrl", title: "Release notes URL", type: "url" }),
  ],
  preview: {
    select: { version: "version", lts: "lts" },
    prepare: ({ version, lts }) => ({
      title: `Blender ${version}${lts ? " LTS" : ""}`,
    }),
  },
});
