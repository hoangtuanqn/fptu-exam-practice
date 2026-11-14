import { userApi } from "@/features/account/api/user.api";
import { Card, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination } from "@/shared/ui/Table";
import { TransactionTable } from "@/features/account/components/TransactionTable";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";

export default function TransactionsPage() {
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => userApi.transactions(page), [page]);
  useClampPage(data?.meta, setPage);

  return (
    <>
      <PageHeader title="Lịch sử giao dịch" description="Mọi biến động số dư trong ví của bạn." />
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          data && (
            <>
              <TransactionTable items={data.items} />
              <Pagination meta={data.meta} onPage={setPage} />
            </>
          )
        )}
      </Card>
    </>
  );
}
