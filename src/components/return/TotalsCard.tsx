"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TotalsCardProps = {
  noOfItems: number;
  totalBill: number;
  totalDesMon: number;
  totalTax: number;
  pthNetBill: number;
};

/** Compact totals summary (especially useful on small screens) */
export function TotalsCard({
  noOfItems,
  totalBill,
  totalDesMon,
  totalTax,
  pthNetBill,
}: TotalsCardProps) {
  return (
    <Card className="lg:hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Document totals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="secondary">Items: {noOfItems}</Badge>
        <Badge variant="secondary">Bill: {totalBill.toFixed(2)}</Badge>
        <Badge variant="secondary">Disc: {totalDesMon.toFixed(2)}</Badge>
        <Badge variant="secondary">Tax: {totalTax.toFixed(2)}</Badge>
        <Badge>Net: {pthNetBill.toFixed(2)}</Badge>
      </CardContent>
    </Card>
  );
}
