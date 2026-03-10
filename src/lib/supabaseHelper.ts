export async function supabaseQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await queryFn();

  if (error) {
    console.error("Supabase error:", error.message);
    throw new Error(error.message);
  }

  if (data === null) {
    throw new Error("Nenhum dado retornado");
  }

  return data;
}

export default supabaseQuery;
