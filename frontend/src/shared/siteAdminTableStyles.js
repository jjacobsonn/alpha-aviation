import { TABLE_ACTIONS_COLUMN_WIDTH } from "../components/TablePaginationBar";

export { TABLE_ACTIONS_COLUMN_WIDTH };

export const siteAdminTableSx = {
  width: "100%",
  tableLayout: "fixed",
  "& .MuiTableCell-root": { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  "& .MuiTableCell-root:last-child": {
    width: TABLE_ACTIONS_COLUMN_WIDTH,
    minWidth: TABLE_ACTIONS_COLUMN_WIDTH,
    maxWidth: TABLE_ACTIONS_COLUMN_WIDTH,
    overflow: "visible",
    textAlign: "right",
  },
};

export const siteAdminActionButtonsSx = {
  background: "#FF4C05",
  borderRadius: "10px",
  color: "white",
  fontWeight: 700,
  boxShadow: 2,
  minWidth: 0,
  px: 1.5,
};

export const siteAdminDeleteButtonSx = {
  background: "#D92B2B",
  borderRadius: "10px",
  color: "white",
  fontWeight: 700,
  boxShadow: 2,
  minWidth: 0,
  px: 1.5,
};
