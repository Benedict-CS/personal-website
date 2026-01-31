"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Linkedin, Github } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string)?.trim() || "";
    const email = (formData.get("email") as string)?.trim() || "";
    const subject = (formData.get("subject") as string)?.trim() || "";
    const message = (formData.get("message") as string)?.trim() || "";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Failed to send. Please try again.");
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
          <h1 className="mb-4 text-4xl font-bold text-slate-900">Contact</h1>
          <p className="mb-2 text-slate-600">
            I&apos;m open to new opportunities, collaborations, or a chat about tech.
          </p>
          <p className="mb-10 text-sm text-slate-500">
            Use the form below, or email me directly at{" "}
            <a href={`mailto:${siteConfig.links.email}`} className="text-slate-700 underline hover:text-slate-900">
              {siteConfig.links.email}
            </a>
            . Messages from the form go to the same address.
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
                    rows={5}
                    placeholder="Your message..."
                    className="bg-white resize-none"
                    disabled={status === "sending"}
                  />
                </div>
                {status === "success" && (
                  <p className="text-sm text-green-600">Message sent. I&apos;ll get back to you soon.</p>
                )}
                {status === "error" && (
                  <p className="text-sm text-red-600">{errorMessage}</p>
                )}
                <Button type="submit" disabled={status === "sending"}>
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
