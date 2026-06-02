import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TablePaginationBar from "../../components/TablePaginationBar";

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
