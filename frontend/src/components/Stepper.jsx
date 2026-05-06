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
                ? 'border border-[rgba(200,169,107,0.24)] bg-[rgba(200,169,107,0.14)] text-[#f4dfb2]'
                : active
                  ? 'border border-[rgba(200,169,107,0.34)] bg-[rgba(255,255,255,0.06)] text-white'
                  : 'border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#bdbdc3]'
            }`}
          >
            {no}. {step}
          </div>
        );
      })}
    </div>
  );
}
