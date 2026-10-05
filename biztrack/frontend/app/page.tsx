import Link from "next/link";
import Button from "@/components/ui/Button";

const features = [
  {
    title: "Track Products",
    description: "Know what's in stock, always. Never sell an item you don't have.",
  },
  {
    title: "Record Sales Fast",
    description: "A clean checkout flow your staff can learn in minutes.",
  },
  {
    title: "Multiple Businesses",
    description: "Run more than one shop from a single account.",
  },
  {
    title: "Team Roles",
    description: "Owner, manager, cashier — decide who sees what.",
  },
];

const steps = [
  { n: "1", title: "Create your account", description: "Register in seconds — no credit card." },
  { n: "2", title: "Add your business", description: "Name it, pick a type, choose your currency." },
  { n: "3", title: "Invite your team", description: "Assign roles and start selling." },
];

const pricing = [
  {
    name: "Starter",
    price: "Free",
    tagline: "For solo shops",
    features: ["1 business", "Up to 2 users", "Basic reports"],
  },
  {
    name: "Growth",
    price: "Coming soon",
    tagline: "For growing teams",
    features: ["3 businesses", "Up to 10 users", "Advanced reports"],
    highlight: true,
  },
  {
    name: "Business",
    price: "Coming soon",
    tagline: "For chains",
    features: ["Unlimited businesses", "Unlimited users", "Priority support"],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-ink-200/70">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
    <Link href="/" className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold shadow-glow text-sm">B</span>
      <span className="text-lg font-semibold text-ink-900 tracking-tight">BizTrack</span>
    </Link>
    <nav className="hidden md:flex items-center gap-8 text-sm text-ink-600">
      <a href="#features" className="hover:text-ink-900 transition-colors">Features</a>
      <a href="#how" className="hover:text-ink-900 transition-colors">How it works</a>
      <a href="#pricing" className="hover:text-ink-900 transition-colors">Pricing</a>
    </nav>
    <div className="flex items-center gap-2">
      <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
      <Link href="/register"><Button size="sm">Get started</Button></Link>
    </div>
  </div>
</header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium mb-4">
          Built for small businesses
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
          Simple inventory and sales<br className="hidden sm:block" />
          <span className="text-brand-600"> management</span> for small businesses
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Replace notebooks and spreadsheets. Track stock, record sales, and manage
          your team — all in one place.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register"><Button className="px-6 py-3 text-base">Get started free</Button></Link>
          <a href="#how"><Button variant="ghost" className="px-6 py-3 text-base">See how it works</Button></a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-slate-900">Everything you need to run your shop</h2>
        <p className="mt-3 text-center text-slate-600">No setup fees, no hidden costs.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-xl border border-slate-200 hover:border-brand-300 transition">
              <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 grid place-items-center font-semibold mb-4">
                ✓
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">How it works</h2>
          <p className="mt-3 text-center text-slate-600">Get up and running in under five minutes.</p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-brand-600 text-white grid place-items-center text-lg font-bold">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-slate-900">Simple pricing</h2>
        <p className="mt-3 text-center text-slate-600">Start free. Upgrade when you're ready.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pricing.map((p) => (
            <div
              key={p.name}
              className={`p-6 rounded-xl border ${
                p.highlight ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"
              }`}
            >
              <h3 className="font-semibold text-slate-900">{p.name}</h3>
              <p className="text-sm text-slate-500">{p.tagline}</p>
              <p className="mt-4 text-3xl font-bold text-slate-900">{p.price}</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-accent-600">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block mt-6">
                <Button variant={p.highlight ? "primary" : "ghost"} className="w-full">
                  Get started
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to take control of your shop?</h2>
          <p className="mt-3 text-brand-100">Create your free account today.</p>
          <Link href="/register" className="inline-block mt-8">
            <Button variant="accent" className="px-6 py-3 text-base">Get started free</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} BizTrack. All rights reserved.</p>
          <p>Simple inventory and sales management for small businesses.</p>
        </div>
      </footer>
    </div>
  );
}