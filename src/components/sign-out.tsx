"use client";

export function SignOut() {
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/");
      }}
    >
      Sign out
    </button>
  );
}
