const values = [
  {
    title: "活动发布更集中",
    description: "主办方统一发布活动信息，减少招募渠道分散带来的沟通成本。"
  },
  {
    title: "报名流程更清晰",
    description: "摊主可以快速查看活动要求、进入报名流程并追踪结果。"
  },
  {
    title: "协同管理更省心",
    description: "从审核到执行的关键节点被统一管理，减少线下反复确认。"
  }
];

export function ValueSection() {
  return (
    <section className="value-section" aria-labelledby="value-title" role="region">
      <h3 id="value-title">为什么使用这套平台</h3>
      <div className="value-grid">
        {values.map((value) => (
          <article key={value.title} className="info-card">
            <h4>{value.title}</h4>
            <p>{value.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
