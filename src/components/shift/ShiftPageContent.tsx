"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "next-auth/react";

import { toast } from "sonner";

import { PageGuard } from "@/components/permissions/page-guard";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {

  Card,

  CardContent,

  CardDescription,

  CardHeader,

  CardTitle,

} from "@/components/ui/card";

import type { ComboboxOption } from "@/components/ui/searchable-combobox";

import { SearchableCombobox } from "@/components/ui/searchable-combobox";

import {

  ApiError,

  getCurrentOpenShift,

  getShiftMovements,

  openFirstShift,

  openShift,

} from "@/lib/api-client";

import { ShiftClosingPanel } from "@/components/shift/ShiftClosingPanel";

import { PERMISSIONS } from "@/lib/route-permissions";

import type { ShiftMovementOption, ShiftStatus } from "@/types/shift";



function formatDateTime(value: string | null | undefined): string {

  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();

}



function formatMoney(value: number | null | undefined): string {

  if (value == null || Number.isNaN(value)) return "—";

  return value.toFixed(2);

}



function parentLabel(movParint: number | null | undefined): string {

  if (movParint === 1) return "Sale";

  if (movParint === 2) return "Return Sale";

  return "Movement";

}



function toMovementOptions(rows: ShiftMovementOption[]): ComboboxOption[] {

  return rows.map((row) => {

    const name = row.movName?.trim();

    const kind = parentLabel(row.movParint);

    const label = name

      ? `${row.movId} - ${name} (${kind})`

      : `${row.movId} (${kind})`;

    return { value: String(row.movId), label };

  });

}



export function ShiftPageContent() {

  const { data: session } = useSession();

  const token = session?.accessToken ?? null;



  const [status, setStatus] = useState<ShiftStatus | null>(null);

  const [movements, setMovements] = useState<ShiftMovementOption[]>([]);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [showNewShiftForm, setShowNewShiftForm] = useState(false);

  const [startingCash, setStartingCash] = useState("0");

  const [openingBalance, setOpeningBalance] = useState("0");

  const [notes, setNotes] = useState("");

  const [movId, setMovId] = useState("");



  const movementOptions = useMemo(

    () => toMovementOptions(movements),

    [movements]

  );



  const isFirstOpening = Boolean(status?.isFirstShiftOpening);

  const canShowNewShift =

    !status?.hasOpenShift && (isFirstOpening || status?.hasShiftHistory);



  const refresh = useCallback(async () => {

    if (!token) {

      setStatus(null);

      setMovements([]);

      setLoading(false);

      return;

    }



    setLoading(true);

    try {

      const data = await getCurrentOpenShift(token);

      setStatus(data);

    } catch (err) {

      setStatus(null);

      toast.error(err instanceof ApiError ? err.message : "Failed to load shift status.");

    }



    try {

      const movRows = await getShiftMovements(token);

      setMovements(movRows);

    } catch (err) {

      setMovements([]);

      if (!isFirstOpening) {

        toast.error(

          err instanceof ApiError

            ? err.message

            : "Failed to load Sales Movement options."

        );

      }

    } finally {

      setLoading(false);

    }

  }, [token]);



  useEffect(() => {

    void refresh();

  }, [refresh]);



  const resetOpenForm = () => {

    setStartingCash("0");

    setOpeningBalance("0");

    setNotes("");

    setMovId("");

    setShowNewShiftForm(false);

  };



  const handleOpenFirst = async () => {

    if (!token) {

      toast.error("Not authenticated.");

      return;

    }



    const cashRaw = startingCash.trim();

    const cash = cashRaw === "" ? 0 : Number(cashRaw);

    if (!Number.isFinite(cash) || cash < 0) {

      toast.error("Starting cash must be zero or a positive number.");

      return;

    }



    setSubmitting(true);

    try {

      await openFirstShift(token, {

        startingCash: cash,

        notes: notes.trim() || null,

      });

      toast.success("First shift opened.");

      resetOpenForm();

      await refresh();

    } catch (err) {

      toast.error(

        err instanceof ApiError ? err.message : "Failed to open first shift."

      );

      await refresh();

    } finally {

      setSubmitting(false);

    }

  };



  const handleOpenNext = async () => {

    if (!token) {

      toast.error("Not authenticated.");

      return;

    }



    const selectedMovId = Number(movId);

    if (!Number.isFinite(selectedMovId) || selectedMovId <= 0) {

      toast.error("Select a Sales Movement (MovId).");

      return;

    }



    if (!movements.some((row) => row.movId === selectedMovId)) {

      toast.error("Selected movement is not valid.");

      return;

    }



    const balanceRaw = openingBalance.trim();

    const balance = balanceRaw === "" ? 0 : Number(balanceRaw);

    if (!Number.isFinite(balance) || balance < 0) {

      toast.error("Opening balance must be zero or a positive number.");

      return;

    }



    setSubmitting(true);

    try {

      await openShift(token, {

        openingBalance: balance,

        notes: notes.trim() || null,

        movId: selectedMovId,

      });

      toast.success("Shift opened.");

      resetOpenForm();

      await refresh();

    } catch (err) {

      toast.error(err instanceof ApiError ? err.message : "Failed to open shift.");

      await refresh();

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <PageGuard

      permission={PERMISSIONS.sales.view}

      redirectTo="/unauthorized?from=shift&permission=Sales.View"

    >

      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4">

        <div>

          <h1 className="text-2xl font-semibold tracking-tight">

            إدارة الوردية / Shift Management

          </h1>

          <p className="text-muted-foreground text-sm">

            فتح وإغلاق وردية المبيعات للصيدلية النشطة على الخادم.

          </p>

        </div>



        <Card>

          <CardHeader>

            <CardTitle>Current pharmacy</CardTitle>

            <CardDescription>Resolved on the server from your active pharmacy scope.</CardDescription>

          </CardHeader>

          <CardContent className="space-y-2 text-sm">

            <div>

              <span className="text-muted-foreground">Pharmacy: </span>

              {loading

                ? "Loading…"

                : status?.pharmacyName?.trim() ||

                  (status?.parmId != null ? `Pharmacy ${status.parmId}` : "—")}

            </div>

            <div>

              <span className="text-muted-foreground">Cost center: </span>

              {loading

                ? "Loading…"

                : status?.costCenterCode

                  ? `${status.costCenterCode}${

                      status.costCenterName ? ` — ${status.costCenterName}` : ""

                    }`

                  : "—"}

            </div>

            <div>

              <span className="text-muted-foreground">Status: </span>

              {loading ? "Loading…" : status?.status ?? "—"}

            </div>

          </CardContent>

        </Card>



        {status?.hasOpenShift ? (

          <Card>

            <CardHeader>

              <CardTitle>Open shift</CardTitle>

              <CardDescription>One open shift per pharmacy (Flag = 0).</CardDescription>

            </CardHeader>

            <CardContent className="space-y-2 text-sm">

              <div>Shift (Sc_Id): {status.scId ?? "—"}</div>

              <div>

                Movement (MovId):{" "}

                {status.moveId != null

                  ? status.movName?.trim()

                    ? `${status.moveId} - ${status.movName.trim()}`

                    : String(status.moveId)

                  : "—"}

              </div>

              <div>Opened: {formatDateTime(status.openedAt)}</div>

              <div>Opening balance: {formatMoney(status.openingBalance)}</div>

              <div>Cashier: {status.cashier ?? "—"}</div>

              {status.notes ? <div>Notes: {status.notes}</div> : null}

              <Button

                type="button"

                variant="outline"

                onClick={() => void refresh()}

                disabled={loading}

                className="mt-2"

              >

                Refresh

              </Button>

            </CardContent>

          </Card>

        ) : null}



        {status?.hasOpenShift ? (

          <ShiftClosingPanel token={token} status={status} onShiftClosed={refresh} />

        ) : null}



        {canShowNewShift && !showNewShiftForm ? (

          <Card>

            <CardHeader>

              <CardTitle>{isFirstOpening ? "First shift" : "New shift"}</CardTitle>

              <CardDescription>

                {isFirstOpening

                  ? "No shift history for this pharmacy. The server assigns Sc_Id and cost center."

                  : "Open the next shift for this pharmacy. Sc_Id and movement are assigned on the server."}

              </CardDescription>

            </CardHeader>

            <CardContent>

              <Button

                type="button"

                onClick={() => setShowNewShiftForm(true)}

                disabled={loading || !token}

              >

                New Shift

              </Button>

            </CardContent>

          </Card>

        ) : null}



        {canShowNewShift && showNewShiftForm ? (

          <Card>

            <CardHeader>

              <CardTitle>{isFirstOpening ? "Open first shift" : "Open new shift"}</CardTitle>

            </CardHeader>

            <CardContent className="space-y-4">

              {isFirstOpening ? (

                <div className="space-y-1">

                  <Label htmlFor="startingCash">Opening balance (starting cash)</Label>

                  <Input

                    id="startingCash"

                    type="number"

                    min="0"

                    step="0.01"

                    className="w-40"

                    value={startingCash}

                    onChange={(event) => setStartingCash(event.target.value)}

                    disabled={loading || submitting}

                  />

                </div>

              ) : (

                <>

                  <div className="space-y-1">

                    <Label>Sales Movement (MovId) *</Label>

                    <SearchableCombobox

                      value={movId}

                      onValueChange={setMovId}

                      options={movementOptions}

                      placeholder={

                        movementOptions.length === 0

                          ? "No Sales Movement configured"

                          : "Select movement"

                      }

                      searchPlaceholder="Search MovId or name..."

                      emptyMessage="No Sales Movement found."

                      disabled={loading || submitting}

                    />

                  </div>

                  <div className="space-y-1">

                    <Label htmlFor="openingBalance">Opening balance</Label>

                    <Input

                      id="openingBalance"

                      type="number"

                      min="0"

                      step="0.01"

                      className="w-40"

                      value={openingBalance}

                      onChange={(event) => setOpeningBalance(event.target.value)}

                      disabled={loading || submitting}

                    />

                  </div>

                </>

              )}

              <div className="space-y-1">

                <Label htmlFor="notes">Notes (optional)</Label>

                <Input

                  id="notes"

                  value={notes}

                  maxLength={50}

                  onChange={(event) => setNotes(event.target.value)}

                  disabled={loading || submitting}

                />

              </div>

              <div className="flex flex-wrap gap-2">

                <Button

                  type="button"

                  onClick={() =>

                    void (isFirstOpening ? handleOpenFirst() : handleOpenNext())

                  }

                  disabled={

                    loading ||

                    submitting ||

                    !token ||

                    (!isFirstOpening && !movId)

                  }

                >

                  {submitting ? "Opening…" : "New Shift"}

                </Button>

                <Button

                  type="button"

                  variant="outline"

                  onClick={resetOpenForm}

                  disabled={submitting}

                >

                  Cancel

                </Button>

              </div>

            </CardContent>

          </Card>

        ) : null}

      </div>

    </PageGuard>

  );

}


