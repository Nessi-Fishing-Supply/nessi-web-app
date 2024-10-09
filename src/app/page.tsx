import Link from "next/link";

export default function Home() {

  return (
    <div>
      <main>
        <h1>Home - Dev</h1>
        <Link href="/components">View Components</Link>
        <Link href="/forgot-password">Forgot Password</Link>
        <Link href="/reset-password">Reset Password</Link>
      </main>
    </div>
  );
}
