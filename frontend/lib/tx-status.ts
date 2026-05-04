export type TxStatus = "idle" | "signing" | "pending" | "success" | "error";

export interface TxState {
  status: TxStatus;
  hash: `0x${string}` | undefined;
}

export function deriveTxStatus({
  isPending,
  isConfirming,
  isSuccess,
  isError,
  hash,
}: {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  hash: `0x${string}` | undefined;
}): TxState {
  if (isSuccess) return { status: "success", hash };
  if (isError) return { status: "error", hash };
  if (isConfirming) return { status: "pending", hash };
  if (isPending) return { status: "signing", hash: undefined };
  return { status: "idle", hash: undefined };
}

export function txButtonLabel(status: TxStatus, defaultLabel: string): string {
  switch (status) {
    case "signing": return "Confirm in wallet…";
    case "pending": return "Confirming…";
    default: return defaultLabel;
  }
}
