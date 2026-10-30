"use client";

export function SignOut() {
  return (
    <button
      className="navlink"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/");
      }}
    >
      Sign out
    </button>
  );
}
