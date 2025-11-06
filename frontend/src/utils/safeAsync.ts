export async function safeAsync<T>(promise: Promise<T>): Promise<{ data?: T; error?: Error }> {
  try {
    const data = await promise;
    return { data };
  } catch (e) {
    return { error: e as Error };
  }
}


