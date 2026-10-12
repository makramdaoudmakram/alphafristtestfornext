import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PharmPurchaseEmployeeShiftFields } from "@/components/pharm-purchase/PharmPurchaseEmployeeShiftFields";
import { lookupSalesManByPassword } from "@/lib/api-client";
import { emptyPurchaseHeader, headerToFormValues } from "@/lib/purchase.mapper";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";

vi.mock("@/lib/api-client", () => ({
  lookupSalesManByPassword: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

type Form = UseFormReturn<
  PurchaseHeaderFormValues,
  unknown,
  PurchaseHeaderFormValues
>;

let formRef: Form | null = null;

function renderFields(
  options: {
    disabled?: boolean;
    openShiftNumber?: number | null;
    initial?: Record<string, unknown>;
  } = {}
): Form {
  function Harness() {
    const form = useForm<PurchaseHeaderFormValues, unknown, PurchaseHeaderFormValues>({
      defaultValues: headerToFormValues({
        ...emptyPurchaseHeader(),
        ...options.initial,
      }),
      mode: "onChange",
    });
    formRef = form;
    return (
      <PharmPurchaseEmployeeShiftFields
        form={form}
        disabled={options.disabled ?? false}
        token="token-1"
        openShiftNumber={options.openShiftNumber ?? null}
      />
    );
  }
  render(<Harness />);
  return formRef!;
}

function employeeInput(): HTMLInputElement {
  return screen.getByPlaceholderText("Enter employee code") as HTMLInputElement;
}

function shiftInput(): HTMLInputElement {
  return screen.getByLabelText("Shift No.") as HTMLInputElement;
}

describe("PharmPurchaseEmployeeShiftFields", () => {
  beforeEach(() => {
    formRef = null;
    vi.mocked(lookupSalesManByPassword).mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("masks the employee code and discourages autofill", () => {
    renderFields();
    const input = employeeInput();

    expect(input.type).toBe("password");
    expect(input.getAttribute("autocomplete")).toBe("new-password");
    expect(input.name).toBe("pharm-purchase-statement-reference");
    expect(input.getAttribute("spellcheck")).toBe("false");
  });

  it("stores only the resolved employee id and never persists the code", async () => {
    vi.mocked(lookupSalesManByPassword).mockResolvedValue({
      id: 4401,
      code: "E-4401",
      name: "Pharmacy buyer",
      employType: 1,
    });

    const form = renderFields();
    const input = employeeInput();
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() =>
      expect(lookupSalesManByPassword).toHaveBeenCalledWith("token-1", "1234")
    );

    expect(form.getValues("employCode")).toBe(4401);
    expect(screen.getByText("Pharmacy buyer (E-4401)")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter employee code")).toBeNull();

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).not.toContain("1234");
  });

  it("clears the typed code and shows a fixed error when the employee is not found", async () => {
    vi.mocked(lookupSalesManByPassword).mockResolvedValue(null);

    const form = renderFields();
    const input = employeeInput();
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("Employee not found.")).toBeInTheDocument());

    expect(form.getValues("employCode")).toBeNull();
    expect(employeeInput().value).toBe("");
    expect(screen.queryByText("1234")).toBeNull();
  });

  it("rejects a delivery employee", async () => {
    vi.mocked(lookupSalesManByPassword).mockResolvedValue({
      id: 5502,
      code: "D-5502",
      name: "Courier",
      employType: 2,
    });

    const form = renderFields();
    const input = employeeInput();
    fireEvent.change(input, { target: { value: "9999" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("Employee not found.")).toBeInTheDocument());
    expect(form.getValues("employCode")).toBeNull();
  });

  it("shows a fixed error when the lookup request fails", async () => {
    vi.mocked(lookupSalesManByPassword).mockRejectedValue(new Error("boom 1234"));

    const form = renderFields();
    const input = employeeInput();
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByText("Employee lookup failed. Try again.")).toBeInTheDocument()
    );
    expect(form.getValues("employCode")).toBeNull();
    expect(screen.queryByText(/boom/)).toBeNull();
  });

  it("Change returns the field to the masked input and clears the id", async () => {
    vi.mocked(lookupSalesManByPassword).mockResolvedValue({
      id: 4401,
      code: "E-4401",
      name: "Pharmacy buyer",
      employType: 1,
    });

    const form = renderFields();
    const input = employeeInput();
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByText("Change")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("Change"));
    });

    expect(form.getValues("employCode")).toBeNull();
    expect(employeeInput()).toBeInTheDocument();
  });

  it("shows the open shift on a new document without letting anyone edit it", () => {
    const form = renderFields({ openShiftNumber: 77 });
    const input = shiftInput();

    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe("77");

    fireEvent.change(input, { target: { value: "5555" } });
    expect(input.value).toBe("77");
    expect(form.getValues("shitNo")).toBeNull();
  });

  it("shows the stored shift of a saved document, never the currently open one", () => {
    renderFields({ openShiftNumber: 88, initial: { id: 12, shitNo: 21 } });
    expect(shiftInput().value).toBe("21");

    cleanup();

    renderFields({ openShiftNumber: 88, initial: { id: 12, shitNo: null } });
    expect(shiftInput().value).toBe("");
    expect(
      screen.getByText("This purchase was saved without a shift.")
    ).toBeInTheDocument();
  });

  it("tells a new document to open a shift before saving", () => {
    renderFields({ openShiftNumber: null });

    expect(shiftInput().value).toBe("");
    expect(
      screen.getByText("No open shift for this pharmacy. Open a shift before saving.")
    ).toBeInTheDocument();
  });

  it("disables both fields for a posted document", () => {
    renderFields({
      disabled: true,
      initial: { id: 12, shitNo: 21, employCode: 4401 },
    });

    expect(shiftInput()).toBeDisabled();
    expect(screen.queryByText("Change")).toBeNull();
    expect(screen.getByText("Employ #4401")).toBeInTheDocument();
  });

  it("shows the employee name returned with a retrieved document", () => {
    renderFields({
      initial: { id: 12, employCode: 4401, employName: "Pharmacy buyer" },
    });

    expect(screen.getByText("Pharmacy buyer")).toBeInTheDocument();
    expect(screen.queryByText("Employ #4401")).toBeNull();
    expect(lookupSalesManByPassword).not.toHaveBeenCalled();
  });

  it("falls back to the employee number when the stored employee has no name", () => {
    renderFields({
      disabled: true,
      initial: { id: 12, employCode: 4401, employName: "   " },
    });

    expect(screen.getByText("Employ #4401")).toBeInTheDocument();
  });
});
