"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Linkedin, Github, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";

const defaultIntro = "I'm open to new opportunities, collaborations, or a chat about tech.";
const defaultFormNote = "Use the form below, or email me directly at";
const formNoteSuffix = "Messages from the form go to the same address.";

const LIMITS = { name: 100, email: 254, subject: 200, message: 5000 } as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContact(name: string, email: string, subject: string, message: string): string | null {
  if (!name.trim()) return "Name is required.";
  if (name.length > LIMITS.name) return `Name must be at most ${LIMITS.name} characters.`;
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) return "Please enter a valid email address.";
  if (email.length > LIMITS.email) return "Email is too long.";
  if (subject.length > LIMITS.subject) return `Subject must be at most ${LIMITS.subject} characters.`;
  if (!message.trim()) return "Message is required.";
  if (message.length > LIMITS.message) return `Message must be at most ${LIMITS.message} characters.`;
  return null;
}

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [intro, setIntro] = useState(defaultIntro);
  const [formNote, setFormNote] = useState(defaultFormNote);

  useEffect(() => {
    fetch("/api/site-content?page=contact")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          if (data.intro?.trim()) setIntro(data.intro);
          if (data.formNote?.trim()) setFormNote(data.formNote);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string)?.trim() || "";
    const email = (formData.get("email") as string)?.trim() || "";
    const subject = (formData.get("subject") as string)?.trim() || "";
    const message = (formData.get("message") as string)?.trim() || "";

    const validationError = validateContact(name, email, subject, message);
    if (validationError) {
      setStatus("error");
      setErrorMessage(validationError);
      return;
    }

    setStatus("sending");
    try {
      const { data, response, error } = await api.post<{ success?: boolean }>("/api/contact", {
        name,
        email,
        subject,
        message,
      });

      if (!response.ok || error) {
        setStatus("error");
        setErrorMessage(error || (data as { error?: string })?.error || "Failed to send. Please try again.");
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl">
          <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
          <h1 className="mb-4 text-4xl font-bold text-slate-900">Contact</h1>
          <p className="mb-2 text-slate-600">
            {intro}
          </p>
          <p className="mb-10 text-sm text-slate-500">
            {formNote}{" "}
            <a href={`mailto:${siteConfig.links.email}`} className="text-slate-700 underline hover:text-slate-900">
              {siteConfig.links.email}
            </a>
            . {formNoteSuffix}
          </p>

          <div className="mb-10 flex flex-wrap gap-3">
            <Link href={`mailto:${siteConfig.links.email}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </Link>
            <Link
              href={siteConfig.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full sm:w-auto">
                <Linkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
            </Link>
            <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full sm:w-auto">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
            </Link>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-900">Send a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={LIMITS.name}
                    placeholder="Your name"
                    className="bg-white"
                    disabled={status === "sending"}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={LIMITS.email}
                    placeholder="you@example.com"
                    className="bg-white"
                    disabled={status === "sending"}
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="mb-1 block text-sm font-medium text-slate-700">
                    Subject (optional)
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    maxLength={LIMITS.subject}
                    placeholder="e.g. Collaboration inquiry"
                    className="bg-white"
                    disabled={status === "sending"}
                  />
                </div>
                <div>
                  <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    maxLength={LIMITS.message}
                    rows={5}
                    placeholder="Your message..."
                    className="bg-white resize-none"
                    disabled={status === "sending"}
                  />
                </div>
                {(status === "success" || status === "error") && (
                  <div
                    id="contact-form-status"
                    role="status"
                    aria-live="polite"
                    className={`flex items-center gap-3 rounded-lg border p-4 text-sm ${
                      status === "success"
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    }`}
                  >
                    {status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    )}
                    <span>
                      {status === "success"
                        ? "Message sent. I'll get back to you soon."
                        : errorMessage}
                    </span>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={status === "sending"}
                  className="min-h-[44px]"
                  aria-busy={status === "sending"}
                  aria-describedby={status === "error" ? "contact-form-status" : undefined}
                >
                  {status === "sending" ? "Sending..." : "Send"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
