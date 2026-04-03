import { getReporteData } from "@/app/actions/reportes";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const now = new Date();
  const initialData = await getReporteData("mensual", now.getMonth(), now.getFullYear());
  return <ReportesClient initialData={initialData} />;
}
