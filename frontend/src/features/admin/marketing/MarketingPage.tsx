import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { PageHeader } from "@/shared/ui/Card";
import { Segmented } from "@/shared/ui/Segmented";
import { BroadcastsTab } from "./BroadcastsTab";
import { CampaignsTab } from "./CampaignsTab";
import { LogsTab } from "./LogsTab";
import { marketingAdminApi } from "./marketing.api";
import { OverviewTab } from "./OverviewTab";

// Thêm tab mới: thêm một dòng ở đây và một nhánh render bên dưới
const TABS = [
  { value: "overview", label: "Tổng quan" },
  { value: "campaigns", label: "Chiến dịch" },
  { value: "broadcasts", label: "Gửi thủ công" },
  { value: "logs", label: "Nhật ký" },
] as const;
type TabKey = (typeof TABS)[number]["value"];

export default function MarketingPage() {
  const [url, setUrl] = useUrlState({ tab: "overview" });
  const tab: TabKey = TABS.some((t) => t.value === url.tab) ? (url.tab as TabKey) : "overview";
  const campaigns = useApi(() => marketingAdminApi.campaigns(), []);
  const overview = useApi(() => marketingAdminApi.overview(), []);

  return (
    <>
      <PageHeader
        title="Email marketing"
        description="Thư gợi ý tự động. Mặc định tắt; người đã huỷ nhận thư sẽ không được gửi."
        action={<Segmented<TabKey> label="Mục email marketing" value={tab} options={[...TABS]} onChange={(v) => setUrl({ tab: v })} />}
      />
      {tab === "overview" && <OverviewTab overview={overview} campaigns={campaigns.data} />}
      {tab === "campaigns" && <CampaignsTab campaigns={campaigns} dailyCap={overview.data?.status?.dailyCap} onParamsSaved={overview.reload} />}
      {tab === "broadcasts" && <BroadcastsTab />}
      {tab === "logs" && <LogsTab campaigns={campaigns.data} />}
    </>
  );
}
