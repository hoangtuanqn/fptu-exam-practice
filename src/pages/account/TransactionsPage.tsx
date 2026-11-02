import { useState } from "react";
import { userApi } from "../../api/user.api";
import { Card, PageHeader } from "../../components/ui/Card";
import { ErrorBox, Loading } from "../../components/ui/Feedback";
import { Pagination } from "../../components/ui/Table";
import { TransactionTable } from "../../components/wallet/TransactionTable";
import { useApi } from "../../hooks/useApi";

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi(() => userApi.transactions(page), [page]);

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
