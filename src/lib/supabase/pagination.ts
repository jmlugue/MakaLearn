/** Read complete libraries in stable pages. A partial failed read must never become an empty success. */
export async function readAllRows<T>(readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const result = await readPage(from, from + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("Records could not be loaded.");
    rows.push(...result.data);
    if (result.data.length < pageSize) return rows;
  }
}
