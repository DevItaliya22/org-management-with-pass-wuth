"use client";

import { SignOutButton } from "../components/SignOutButton";
import { SessionInfo } from "../components/SessionInfo";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export default function Home() {
  const updateUserName = useMutation(api.users.updateUserName);
  const [newName, setNewName] = useState("");

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      try {
        await updateUserName({ name: newName.trim() });
        setNewName("");
      } catch (error) {
        console.error("Failed to update name:", error);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <h1 className="text-xl font-bold">Org Management System</h1>
        <SignOutButton />
      </header>
      <main className="p-8 flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">
          Welcome to Org Management
        </h1>
        <SessionInfo />

        {/* Name Update Form */}
        <div className="max-w-md mx-auto bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Update Your Name</h2>
          <form onSubmit={handleNameUpdate} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Update
            </button>
          </form>
        </div>
        <div className="flex flex-col gap-4 max-w-lg mx-auto">
          <p>
            Edit{" "}
            <code className="text-sm font-bold font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded-md">
              convex/session.ts
            </code>{" "}
            to change your backend queries
          </p>
          <p>
            Edit{" "}
            <code className="text-sm font-bold font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded-md">
              app/page.tsx
            </code>{" "}
            to change your frontend
          </p>
          <p>
            See the{" "}
            <Link href="/server" className="underline hover:no-underline">
              /server route
            </Link>{" "}
            for an example of loading data in a server component
          </p>
        </div>
        <div className="flex flex-col">
          <p className="text-lg font-bold">Useful resources:</p>
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <ResourceCard
                title="Convex docs"
                description="Read comprehensive documentation for all Convex features."
                href="https://docs.convex.dev/home"
              />
              <ResourceCard
                title="Stack articles"
                description="Learn about best practices, use cases, and more from a growing
              collection of articles, videos, and walkthroughs."
                href="https://www.typescriptlang.org/docs/handbook/2/basic-types.html"
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <ResourceCard
                title="Templates"
                description="Browse our collection of templates to get started quickly."
                href="https://www.convex.dev/templates"
              />
              <ResourceCard
                title="Discord"
                description="Join our developer community to ask questions, trade tips & tricks,
              and show off your projects."
                href="https://www.convex.dev/community"
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function ResourceCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-slate-200 dark:bg-slate-800 p-4 rounded-md h-28 overflow-auto">
      <a href={href} className="text-sm underline hover:no-underline">
        {title}
      </a>
      <p className="text-xs">{description}</p>
    </div>
  );
}
