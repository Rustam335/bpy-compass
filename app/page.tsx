import { Chat } from "./components/chat";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Blender Python answers that match <em>your</em> version.
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Every answer is read from a Sanity Context Knowledge Base built from official release notes,
          with each claim cited and stale patterns called out. Pick a version, ask a scripting question.
        </p>
      </header>
      <Chat />
    </div>
  );
}
