import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/status-badge";
import { RequestActions } from "@/components/admin/request-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeVN, formatVnd } from "@/lib/utils";
import { servicePackages } from "@/lib/mock-data";
import { listQuoteRequests } from "@/lib/quote-store";

const educationLevelLabels: Record<string, string> = {
  thpt: "THPT",
  dai_hoc: "Đại học",
  thac_si: "Thạc sĩ",
};

function packageLabel(id: string) {
  return servicePackages.find((p) => p.id === id)?.name ?? id;
}

export default async function AdminRequestsPage() {
  const requests = await listQuoteRequests();

  return (
    <>
      <AdminPageHeader
        title="Yêu cầu"
        description="Danh sách yêu cầu báo giá gửi từ trang chủ, chờ đội ngũ duyệt."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Quốc gia</TableHead>
              <TableHead>Bậc học</TableHead>
              <TableHead>Gói dịch vụ</TableHead>
              <TableHead>Báo giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Chưa có yêu cầu báo giá nào từ khách.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    <div>{req.email}</div>
                    <div className="text-xs font-normal text-muted-foreground">{req.phone}</div>
                  </TableCell>
                  <TableCell>{req.country}</TableCell>
                  <TableCell>{educationLevelLabels[req.education_level] ?? req.education_level}</TableCell>
                  <TableCell>{packageLabel(req.package)}</TableCell>
                  <TableCell>{formatVnd(req.quote_amount)}</TableCell>
                  <TableCell>
                    <RequestStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTimeVN(req.created_at)}</TableCell>
                  <TableCell>
                    <RequestActions id={req.id} status={req.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
