const MAX_LENGTHS = { name: 100, email: 254, phone: 30, message: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status = 200) => Response.json(body, { status });

async function handleContact(request, env) {
  if (!env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ error: "Contact form is not configured." }, 500);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success to bots.
  if (data.website) return json({ ok: true });

  const fields = {};
  for (const [key, max] of Object.entries(MAX_LENGTHS)) {
    fields[key] = typeof data[key] === "string" ? data[key].trim() : "";
    if (fields[key].length > max) {
      return json({ error: `${key} is too long.` }, 400);
    }
  }

  if (!fields.name || !fields.message || !EMAIL_PATTERN.test(fields.email)) {
    return json({ error: "Name, a valid email, and a message are required." }, 400);
  }

  const text = [
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone || "not provided"}`,
    "",
    fields.message,
  ].join("\n");

  try {
    await env.EMAIL.send({
      from: { email: env.CONTACT_FROM, name: "The Business Builder Website" },
      to: env.CONTACT_TO,
      replyTo: { email: fields.email, name: fields.name },
      subject: `New website inquiry from ${fields.name.replace(/[\r\n]+/g, " ")}`,
      text,
    });
  } catch (err) {
    console.error("Email send failed", err);
    return json({ error: "Could not send your message. Please call us instead." }, 502);
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
