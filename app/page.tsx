import { Chat } from "./components/chat";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          bpy answers that run on the Blender version you actually have.
        </h1>
        <p className="text-ink-dim">
          The Python API changes every release and old tutorials keep ranking. bpy-compass reads a
          Sanity Context Knowledge Base built from the official release notes, cites the entries it
          used, and tells you which popular pattern broke, in which version, and what replaced it.
        </p>
      </header>
      <Chat />
    </div>
  );
}
