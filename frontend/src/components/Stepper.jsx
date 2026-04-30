export default function Stepper({ steps = [], activeStep = 1 }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {steps.map((step, idx) => {
        const no = idx + 1;
        const active = no === activeStep;
        const complete = no < activeStep;
        return (
          <div
            key={step}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              complete
                ? 'bg-emerald-100 text-emerald-800'
                : active
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-600'
            }`}
          >
            {no}. {step}
          </div>
        );
      })}
    </div>
  );
}
