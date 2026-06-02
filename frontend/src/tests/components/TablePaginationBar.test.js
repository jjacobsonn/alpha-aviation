import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TablePaginationBar, { SITE_ADMIN_ROWS_PER_PAGE_OPTIONS } from "../../components/TablePaginationBar";

test("shows single page indicator and arrow navigation", async () => {
  const user = userEvent.setup();
  const onPageChange = jest.fn();

  render(
    <TablePaginationBar
      page={1}
      pageCount={3}
      pageSize={5}
      total={12}
      onPageChange={onPageChange}
      alignWithActions
    />
  );

  expect(screen.getByText("Showing 1–5 of 12")).toBeInTheDocument();
  expect(screen.getByLabelText("Page 1 of 3")).toHaveTextContent("1");
  expect(screen.queryByLabelText("Go to page 2")).not.toBeInTheDocument();

  await user.click(screen.getByLabelText("Next page"));
  expect(onPageChange).toHaveBeenCalledWith(2);
});

test("rows dropdown sits left of pagination and changes page size", async () => {
  const user = userEvent.setup();
  const onPageSizeChange = jest.fn();

  render(
    <TablePaginationBar
      page={1}
      pageCount={2}
      pageSize={5}
      total={12}
      onPageChange={jest.fn()}
      onPageSizeChange={onPageSizeChange}
      alignWithActions
    />
  );

  expect(SITE_ADMIN_ROWS_PER_PAGE_OPTIONS).toEqual([5, 15, 25, 35, 45, 50]);

  const rowsField = screen.getByLabelText("Rows");
  await user.click(rowsField);
  await user.click(screen.getByRole("option", { name: "25" }));
  expect(onPageSizeChange).toHaveBeenCalledWith(25);
});
