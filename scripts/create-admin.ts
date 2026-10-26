/*
  Creates the first admin login (or promotes an existing login to admin).

  Usage (from the project folder, with .env.local filled in):
    npm run create-admin -- founder@seeyouabroad.in "Nico"

  You'll be asked to type a password. It's never stored in this project.
*/
import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  const fullName = nameParts.join(" ").trim();
  if (!email || !email.includes("@") || !fullName) {
    console.error('Usage: npm run create-admin -- you@example.com "Your Name"');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, { app_metadata: { role: "admin" } });
    const { error } = await supabase.from("profiles").update({ role: "admin", active: true, full_name: fullName }).eq("id", existing.id);
    if (error) throw error;
    console.log(`${email} is now an admin.`);
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = (await rl.question("Choose a password (at least 8 characters): ")).trim();
  rl.close();
  if (password.length < 8) {
    console.error("Password is too short.");
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role: "admin" },
  });
  if (error) throw error;
  // Make sure the profile says admin even if the trigger ran before app_metadata was set.
  await supabase.from("profiles").update({ role: "admin", full_name: fullName }).eq("id", data.user.id);
  console.log(`Admin created: ${email}. Sign in at your CRM address.`);
}

main().catch((e) => {
  console.error("Failed:", e.message ?? e);
  process.exit(1);
});
