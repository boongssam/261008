"use client";

import { use } from "react";
import { RubricEditor } from "@/components/RubricEditor";

export default function EditRubricPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RubricEditor key={id} rubricId={id} />;
}
