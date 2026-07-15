import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Section */}
      <section className="text-center py-6 sm:py-12">
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
          Smart Finance Calculators
          <span className="block text-primary-600">Built for India</span>
        </h1>
        <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-2">
          Accurate, transparent financial calculations with AI-powered
          explanations. Your money, clearly understood.
        </p>
      </section>

      {/* Calculator Grid */}
      <section>
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Calculators</h2>
        <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <CalculatorCard
            title="Income Tax"
            description="Calculate your income tax under Old and New regimes for FY 2024-25. Compare and optimize."
            href="/calculators/income-tax"
            badge="Live"
          />
          <CalculatorCard
            title="CTC Calculator"
            description="Break down your CTC into gross salary, deductions, and in-hand salary with custom company structures."
            href="/calculators/ctc"
            badge="Live"
          />
          <CalculatorCard
            title="In-Hand Salary"
            description="Calculate your actual monthly take-home from salary components after PF, PT, and TDS."
            href="/calculators/inhand-salary"
            badge="Live"
          />
          <CalculatorCard
            title="Salary Breakup"
            description="Generate a detailed salary structure from CTC or gross. See all components clearly."
            href="/calculators/salary-breakup"
            badge="Live"
          />
          <CalculatorCard
            title="Offer Comparison"
            description="Compare multiple job offers on actual in-hand salary by normalizing different CTC structures."
            href="/calculators/offer-comparison"
            badge="Live"
          />
          <CalculatorCard
            title="Increment Calculator"
            description="See the real impact of a salary hike. How much of your increment actually reaches your bank?"
            href="/calculators/increment"
            badge="Live"
          />
          <CalculatorCard
            title="SIP Returns"
            description="Project your wealth growth with SIP investments. Step-up SIP, scenario analysis, and LTCG estimation."
            href="/calculators/sip"
            badge="Live"
          />
          <CalculatorCard
            title="My Watchlist"
            description="Save stocks you're tracking. Click any stock on the Market Dashboard to add it."
            href="/market/watchlist"
            badge="Live"
          />
          <CalculatorCard
            title="Market Dashboard"
            description="Live NSE prices for 30 major stocks. Top gainers, losers, and sector heatmap — all in one view."
            href="/market"
            badge="Live"
          />
        </div>
      </section>

      {/* Features */}
      <section className="py-4 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Why FinSight?</h2>
        <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <FeatureCard
            title="100% Accurate"
            description="Deterministic calculations with versioned tax rules. No AI hallucinations in numbers."
          />
          <FeatureCard
            title="AI Explanations"
            description="Get plain-language breakdowns, optimization tips, and scenario comparisons."
          />
          <FeatureCard
            title="Always Current"
            description="Rules updated every budget. Multi-FY support for historical planning."
          />
        </div>
      </section>
    </div>
  );
}

function CalculatorCard({
  title,
  description,
  href,
  badge,
  disabled = false,
}: {
  title: string;
  description: string;
  href: string;
  badge: string;
  disabled?: boolean;
}) {
  const content = (
    <div className={`card h-full transition-shadow ${disabled ? "opacity-60" : "hover:shadow-md active:scale-[0.99] cursor-pointer"}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            badge === "Live"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-3">{description}</p>
    </div>
  );

  if (disabled) return content;
  return <Link href={href}>{content}</Link>;
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-primary-700 text-sm sm:text-base">{title}</h3>
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600">{description}</p>
    </div>
  );
}
