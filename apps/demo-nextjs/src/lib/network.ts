function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();

    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function readRequiredString(body: Record<string, unknown> | null, key: string): string | undefined {
  const value = body?.[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : undefined;
}

export function jsonError(message: string, status: number): Response {
  return Response.json(
    {
      error: message
    },
    {
      status
    }
  );
}

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}
