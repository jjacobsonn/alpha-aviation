import { Navigate, useSearchParams } from "react-router";

/** Legacy route — calibration UI lives on Parts → Calibrated tools tab. */
export default function ToolsPage() {
  const [searchParams] = useSearchParams();
  const tool = searchParams.get("tool");
  const qs = new URLSearchParams({ tab: "tools" });
  if (tool) qs.set("tool", tool);
  return <Navigate to={`/parts?${qs.toString()}`} replace />;
}
