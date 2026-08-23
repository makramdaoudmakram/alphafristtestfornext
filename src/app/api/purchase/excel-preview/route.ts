import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parsePurTransDExcelPreview } from "@/lib/purtransd-excel-parse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "An Excel file is required." },
      { status: 400 }
    );
  }

  const fileName = file.name || "upload.xlsx";
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (extension !== ".xlsx" && extension !== ".xlsm") {
    return NextResponse.json(
      { message: "Only .xlsx or .xlsm files are supported." },
      { status: 400 }
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    const preview = parsePurTransDExcelPreview(buffer, fileName);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "The Excel file could not be read.",
      },
      { status: 400 }
    );
  }
}
