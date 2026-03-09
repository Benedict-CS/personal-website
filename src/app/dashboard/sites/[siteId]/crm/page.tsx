"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailBuilder } from "@/components/saas/email-builder";

type Contact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string;
  createdAt: string;
};

type FormSubmission = {
  id: string;
  pageSlug: string | null;
  formName: string | null;
  createdAt: string;
  contact?: { email?: string | null } | null;
};

export default function SiteCrmPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;
  const [tab, setTab] = useState<"contacts" | "submissions" | "email" | "agents">("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [contactsRes, submissionsRes] = await Promise.all([
      fetch(`/api/saas/sites/${siteId}/crm/contacts`),
      fetch(`/api/saas/sites/${siteId}/crm/form-submissions`),
    ]);
    if (contactsRes.ok) setContacts(await contactsRes.json());
    if (submissionsRes.ok) setSubmissions(await submissionsRes.json());
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [siteId, load]);

  const addContact = async () => {
    if (!newContactEmail.trim()) return;
    const res = await fetch(`/api/saas/sites/${siteId}/crm/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newContactEmail, source: "manual" }),
    });
    if (res.ok) {
      setStatus("Contact created.");
      setNewContactEmail("");
      await load();
    } else {
      setStatus("Failed to create contact.");
    }
  };

  const runAgent = async (type: "marketing" | "support") => {
    const res = await fetch(`/api/saas/sites/${siteId}/agents/${type}/run`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus(`${type} agent executed: ${JSON.stringify(data)}`);
      await load();
    } else {
      setStatus(typeof data.error === "string" ? data.error : `Failed to run ${type} agent`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM & Email Marketing</h1>
          <p className="text-slate-600">Contacts, submissions, autonomous agents, and visual email campaigns.</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/pages`}>
          <Button variant="outline">Back to Pages</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "contacts" ? "default" : "outline"} onClick={() => setTab("contacts")}>Contacts</Button>
        <Button variant={tab === "submissions" ? "default" : "outline"} onClick={() => setTab("submissions")}>Submissions</Button>
        <Button variant={tab === "email" ? "default" : "outline"} onClick={() => setTab("email")}>Email Builder</Button>
        <Button variant={tab === "agents" ? "default" : "outline"} onClick={() => setTab("agents")}>AI Agents</Button>
      </div>

      {tab === "contacts" ? (
        <div className="space-y-3">
          <div className="rounded border border-slate-200 bg-white p-3 flex gap-2">
            <Input value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} placeholder="email@example.com" />
            <Button onClick={addContact}>Add Contact</Button>
          </div>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded border border-slate-200 bg-white p-3">
                <p className="font-medium">{contact.email}</p>
                <p className="text-xs text-slate-600">Source: {contact.source}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "submissions" ? (
        <div className="space-y-2">
          {submissions.map((submission) => (
            <div key={submission.id} className="rounded border border-slate-200 bg-white p-3">
              <p className="font-medium">{submission.formName || "form"}</p>
              <p className="text-xs text-slate-600">Page: {submission.pageSlug || "-"}</p>
              <p className="text-xs text-slate-600">Email: {submission.contact?.email || "-"}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "email" ? <EmailBuilder siteId={siteId} /> : null}

      {tab === "agents" ? (
        <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Autonomous agents can optimize low-performing pages and draft support replies from CRM + product knowledge.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runAgent("marketing")}>Run Marketing Agent</Button>
            <Button variant="outline" onClick={() => runAgent("support")}>Run Support Agent</Button>
          </div>
        </div>
      ) : null}

      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </div>
  );
}

