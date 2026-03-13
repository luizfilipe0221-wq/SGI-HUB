export async function supabaseQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }>
): Promise<T | null> {
  const { data, error } = await queryFn();

  if (error) {
    console.error("Supabase error:", error.message);
    throw new Error(error.message);
  }

  return data;
}

export default supabaseQuery;
