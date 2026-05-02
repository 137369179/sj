const steps = ["发布活动", "摊主报名", "审核沟通", "现场执行"];

export function FlowSection() {
  return (
    <section className="flow-section" aria-labelledby="flow-title" role="region">
      <h3 id="flow-title">核心流程</h3>
      <ol className="flow-list">
        {steps.map((step, index) => (
          <li key={step} className="flow-item">
            <span className="flow-index">0{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
