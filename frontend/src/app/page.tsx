export default function HomePage() {
  return (
    <main className="min-h-screen bg-sand-50 text-ink-900 px-4 py-6 sm:px-6 sm:py-8 max-w-xl mx-auto">
      {/* Header & Trilingual Branding */}
      <header className="mb-6 flex items-center justify-between border-b border-sand-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-700 tracking-tight flex items-center gap-2">
            <span aria-hidden="true" className="text-gold-500">🌾</span>
            <span>Goviya Plus</span>
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            ගොවියා ප්ලස් • கோவியா பிளஸ்
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-600" aria-hidden="true"></span>
          <span>v1.0.0</span>
        </span>
      </header>

      {/* Hero Welcome Card */}
      <section className="bg-white rounded-card shadow-card border border-sand-200 p-5 mb-5">
        <h2 className="text-lg font-bold text-ink-900 mb-2">
          AI Smart Farm Records & Crop Advisory
        </h2>
        <p className="text-sm text-ink-600 mb-4 leading-relaxed">
          Secure farm record-keeping, verified extension officer collaboration with privacy-preserved GPS, and responsible AI-powered record insights.
        </p>

        {/* Primary CTA Button (48px min height, amber with dark text) */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="min-h-touch px-5 py-3 rounded-card bg-cta text-cta-text font-semibold hover:bg-cta-hover active:bg-cta-pressed transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span aria-hidden="true" className="text-gold-700">📋</span>
            <span>View Farm Records</span>
          </button>
          <button
            type="button"
            className="min-h-touch px-5 py-3 rounded-card bg-green-50 text-green-700 border border-green-200 font-semibold hover:bg-green-100 active:bg-green-200 transition-colors flex items-center justify-center gap-2"
          >
            <span aria-hidden="true" className="text-green-600">🤝</span>
            <span>Officer Shares</span>
          </button>
        </div>
      </section>

      {/* Feature Navigation / Status Cards */}
      <section className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-card shadow-card border border-sand-200 p-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-2 font-bold">
              🌱
            </div>
            <h3 className="font-semibold text-sm text-ink-900">Plots & Fields</h3>
            <p className="text-xs text-ink-600 mt-1">AES-256 GPS privacy</p>
          </div>
          <span className="text-xs font-semibold text-status-success mt-3 inline-block">
            ● Active
          </span>
        </div>

        <div className="bg-white rounded-card shadow-card border border-sand-200 p-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-full bg-earth-100 text-earth-800 flex items-center justify-center mb-2 font-bold">
              🌤️
            </div>
            <h3 className="font-semibold text-sm text-ink-900">Weather Forecast</h3>
            <p className="text-xs text-ink-600 mt-1">District centroid data</p>
          </div>
          <span className="text-xs font-semibold text-status-success mt-3 inline-block">
            ● Connected
          </span>
        </div>
      </section>

      {/* Responsible AI Card (Purple Theme ONLY) */}
      <section className="bg-ai-50 rounded-card shadow-card border border-ai-300 p-5 mb-5 text-ai-800">
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden="true" className="text-ai-600 text-lg">✨</span>
          <h2 className="text-base font-bold text-ai-800">Responsible AI Summary</h2>
        </div>
        <p className="text-xs text-ai-800 leading-relaxed mb-3">
          AI summarizes verified farm logs and suggests discussion questions for your Agricultural Extension Officer.
        </p>
        <div className="bg-white/80 rounded-md p-3 border border-ai-300 text-xs mb-3">
          <strong className="text-ai-800 block mb-1">Informational Notice:</strong>
          <span>
            AI output is for guidance only and never prescribes pesticide/fertilizer dosages or provides definitive diagnoses. Consult your verified officer.
          </span>
        </div>
        <button
          type="button"
          className="min-h-touch w-full px-4 py-2.5 rounded-card bg-ai-600 text-white font-semibold hover:bg-ai-800 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <span>Ask AI Record Assistant</span>
        </button>
      </section>

      {/* Coming Soon Stub Section (for requested features without backend endpoints) */}
      <section className="bg-white rounded-card shadow-card border border-sand-200 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">
          Platform Pipeline Status
        </h3>
        <div className="flex items-center justify-between text-xs py-2 border-b border-sand-200">
          <span className="text-ink-600">SMS / USSD Offline Sync</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sand-200 text-ink-600">
            Coming soon
          </span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2">
          <span className="text-ink-600">Satellite NDVI Imagery</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sand-200 text-ink-600">
            Coming soon
          </span>
        </div>
      </section>
    </main>
  );
}
