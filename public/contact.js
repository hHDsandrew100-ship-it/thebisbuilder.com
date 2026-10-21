const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");
const submit = form.querySelector("button[type=submit]");

document.getElementById("year").textContent = new Date().getFullYear();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submit.disabled = true;
  status.className = "";
  status.textContent = "Sending...";

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();

    if (!response.ok) throw new Error(result.error);

    form.reset();
    status.textContent = "Thank you. Your message was sent.";
  } catch (err) {
    status.className = "error";
    status.textContent = err.message || "Could not send your message. Please call 503-930-9141.";
  } finally {
    submit.disabled = false;
  }
});
