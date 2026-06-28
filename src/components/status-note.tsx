export function StatusNote({ configured, error }: { configured: boolean; error?: string }) {
  if (configured && !error) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 shadow-sm shadow-amber-100/60">
      {!configured
        ? "Supabase 环境变量还没有配置，页面会先显示空数据骨架。配置后即可读取和写入真实数据。"
        : `Supabase 查询失败：${error}`}
    </div>
  );
}
