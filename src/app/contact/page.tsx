"use client";

import { useState, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Linkedin, Github, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import {
  publicMarketingBackgroundClassName,
  PublicPageHeader,
  PublicPageShell,
} from "@/components/public/public-layout";

const defaultIntro = "I'm open to new opportunities, collaborations, or a chat about tech.";
const defaultFormNote = "Use the form below, or choose one of the contact buttons.";
const defaultEmailLabel = "Email";
const defaultLinkedinLabel = "LinkedIn";
const defaultGithubLabel = "GitHub";
const CONTACT_BUTTON_KEYS = ["email", "linkedin", "github"] as const;
type ContactButtonKey = (typeof CONTACT_BUTTON_KEYS)[number];

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
  const [title, setTitle] = useState("Contact");
  const [intro, setIntro] = useState(defaultIntro);
  const [formNote, setFormNote] = useState(defaultFormNote);
  const [contactEmail, setContactEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [emailLabel, setEmailLabel] = useState(defaultEmailLabel);
  const [linkedinLabel, setLinkedinLabel] = useState(defaultLinkedinLabel);
  const [githubLabel, setGithubLabel] = useState(defaultGithubLabel);
  const [buttonOrder, setButtonOrder] = useState<ContactButtonKey[]>(["email", "linkedin", "github"]);
  const [buttonVisibility, setButtonVisibility] = useState<Record<ContactButtonKey, boolean>>({
    email: true,
    linkedin: true,
    github: true,
  });

  useEffect(() => {
    fetch("/api/site-content?page=contact")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          if (data.title?.trim()) setTitle(data.title);
          if (data.intro?.trim()) setIntro(data.intro);
          if (data.formNote?.trim()) setFormNote(data.formNote);
          if (data.email?.trim()) setContactEmail(data.email);
          if (data.linkedin?.trim()) setLinkedinUrl(data.linkedin);
          if (data.github?.trim()) setGithubUrl(data.github);
          if (data.emailLabel?.trim()) setEmailLabel(data.emailLabel);
          if (data.linkedinLabel?.trim()) setLinkedinLabel(data.linkedinLabel);
          if (data.githubLabel?.trim()) setGithubLabel(data.githubLabel);
          if (Array.isArray(data.buttonOrder)) {
            const filtered = data.buttonOrder.filter((key: unknown): key is ContactButtonKey =>
              CONTACT_BUTTON_KEYS.includes(String(key) as ContactButtonKey)
            );
            if (filtered.length > 0) {
              const missing = CONTACT_BUTTON_KEYS.filter((key) => !filtered.includes(key));
              setButtonOrder([...filtered, ...missing]);
            }
          }
          if (data.buttonVisibility && typeof data.buttonVisibility === "object") {
            setButtonVisibility((current) => ({
              email: typeof data.buttonVisibility.email === "boolean" ? data.buttonVisibility.email : current.email,
              linkedin: typeof data.buttonVisibility.linkedin === "boolean" ? data.buttonVisibility.linkedin : current.linkedin,
              github: typeof data.buttonVisibility.github === "boolean" ? data.buttonVisibility.github : current.github,
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const emailValue = (contactEmail || "").replace(/^mailto:/i, "");
  const emailHref = emailValue ? `mailto:${emailValue}` : "#";
  const linkedinHref = linkedinUrl || "#";
  const githubHref = githubUrl || "#";
  const contactButtons: Record<ContactButtonKey, { href: string; label: string; targetBlank?: boolean; icon: ReactNode; editorKey: string }> = {
    email: {
      href: emailHref,
      label: emailLabel || defaultEmailLabel,
      icon: <Mail className="mr-2 h-4 w-4" />,
      editorKey: "contact.email",
    },
    linkedin: {
      href: linkedinHref,
      label: linkedinLabel || defaultLinkedinLabel,
      targetBlank: true,
      icon: <Linkedin className="mr-2 h-4 w-4" />,
      editorKey: "contact.linkedin",
    },
    github: {
      href: githubHref,
      label: githubLabel || defaultGithubLabel,
      targetBlank: true,
      icon: <Github className="mr-2 h-4 w-4" />,
      editorKey: "contact.github",
    },
  };

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
    <div className={publicMarketingBackgroundClassName}>
      <PublicPageShell pad="spacious" className="pb-16 md:pb-24">
        <div className="mx-auto max-w-2xl">
          <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
          <PublicPageHeader
            className="mb-6 sm:mb-8"
            title={<span data-inline-field="contact.title">{title}</span>}
            titleClassName="text-4xl"
            description={<span data-inline-field="contact.intro">{intro}</span>}
          />
          <p className="mb-6 text-sm text-muted-foreground" data-inline-field="contact.formNote">
            {formNote}
          </p>
          <div className="mb-10 flex flex-wrap gap-3" data-contact-buttons-container>
            {buttonOrder
              .filter((key) => buttonVisibility[key] !== false)
              .map((key) => {
                const button = contactButtons[key];
                return (
                  <Link
                    key={key}
                    href={button.href}
                    target={button.targetBlank ? "_blank" : undefined}
                    rel={button.targetBlank ? "noopener noreferrer" : undefined}
                    data-editor-button={button.editorKey}
                    data-contact-button={key}
                  >
                    <Button variant="outline" className="w-full sm:w-auto">
                      {button.icon}
                      <span data-editor-button-label>{button.label}</span>
                    </Button>
                  </Link>
                );
              })}
          </div>

          <Card className="shadow-[var(--shadow-lg)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Send a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={LIMITS.name}
                    placeholder="Your name"
                    disabled={status === "sending"}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={LIMITS.email}
                    placeholder="you@example.com"
                    disabled={status === "sending"}
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    Subject (optional)
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    maxLength={LIMITS.subject}
                    placeholder="e.g. Collaboration inquiry"
                    disabled={status === "sending"}
                  />
                </div>
                <div>
                  <label htmlFor="message" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    maxLength={LIMITS.message}
                    rows={5}
                    placeholder="Your message..."
                    className="resize-none"
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
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
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
                  aria-describedby={
                    status === "success" || status === "error" ? "contact-form-status" : undefined
                  }
                >
                  {status === "sending" ? "Sending..." : "Send"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PublicPageShell>
    </div>
  );
}
