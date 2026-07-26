export default function Footer() {
  return (
    <footer className="bg-navy text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 text-sm space-y-3">
        <p className="font-bold text-base">Team W Realty LLC</p>
        <p className="text-slate-300">Licensed Real Estate Broker | 55 Old Turnpike Rd #408, Nanuet, NY | 845-422-5238</p>
        <p className="text-slate-300">
          Team W Realty LLC is committed to fair housing and complies with all federal, state, and local
          fair housing laws. <a href="https://teamwny.com" className="underline">Standardized Operating Procedures</a>
        </p>
        <div className="flex gap-4 text-slate-300">
          <a href="/privacy" className="underline">Privacy Policy</a>
          <a href="/terms" className="underline">Terms of Service</a>
        </div>
        <p className="text-slate-400 text-xs pt-2">
          Internal inventory tool. Listing details are confidential to Team W Realty.
        </p>
      </div>
    </footer>
  );
}
