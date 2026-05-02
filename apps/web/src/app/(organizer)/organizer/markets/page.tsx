import { AppShell } from "../../../../components/layout/app-shell";

export default function OrganizerMarketsPage() {
  return (
    <AppShell>
      <main aria-labelledby="organizer-markets-title">
        <h2 id="organizer-markets-title">我的市集</h2>
        <p>创建草稿、编辑信息，并在准备完成后发布市集。</p>
        <form aria-label="市集表单">
          <label>
            市集标题
            <input name="title" type="text" />
          </label>
          <label>
            城市
            <input name="city" type="text" />
          </label>
          <button type="submit">保存草稿</button>
          <button type="button">发布市集</button>
        </form>
      </main>
    </AppShell>
  );
}
