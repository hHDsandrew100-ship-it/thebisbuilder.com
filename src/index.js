const MAX_FIELDS = 60;
const MAX_KEY_LENGTH = 80;
const MAX_VALUE_LENGTH = 3000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status = 200) => Response.json(body, { status });
const singleLine = (text) => text.replace(/[\r\n]+/g, " ");

async function handleContact(request, env) {
  if (!env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ error: "Contact form is not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const entries = Object.entries(body?.fields ?? {});
  if (!entries.length || entries.length > MAX_FIELDS) {
    return json({ error: "Invalid request." }, 400);
  }

  const fields = {};
  for (const [key, value] of entries) {
    if (typeof value !== "string" || key.length > MAX_KEY_LENGTH || value.length > MAX_VALUE_LENGTH) {
      return json({ error: "Invalid request." }, 400);
    }
    fields[key] = value.trim();
  }

  const name = fields["Owner name"];
  const email = fields["Email"];
  if (!name || !EMAIL_PATTERN.test(email ?? "")) {
    return json({ error: "Name and a valid email are required." }, 400);
  }

  const text = Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  try {
    await env.EMAIL.send({
      from: { email: env.CONTACT_FROM, name: "The Business Builder Website" },
      to: env.CONTACT_TO,
      replyTo: { email, name: singleLine(name) },
      subject: `Assessment request: ${singleLine(fields["Business name"] || name)}`,
      text,
    });
  } catch (err) {
    console.error("Email send failed", err);
    return json({ error: "Could not send your request." }, 502);
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/contact") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405);
      }
      return handleContact(request, env);
    }

    return json({ error: "Not found." }, 404);
  },
};
