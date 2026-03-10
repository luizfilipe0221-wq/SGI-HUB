import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Puxando as chaves .env na raiz
const envFile = fs.readFileSync(".env", "utf-8");
const envVars = Object.fromEntries(
    envFile.split("\n").filter(l => l && !l.startsWith("#")).map(l => l.split("="))
);

const supabase = createClient(envVars["VITE_SUPABASE_URL"], envVars["VITE_SUPABASE_ANON_KEY"]);

async function checkPolicies() {
    const { data, error } = await supabase.rpc("get_policies_for_listas");
    console.log("RPC Error?", error);
    // Se RPC não rolar, vamos forçar fetch na tabela 'listas' para vermos a struct.
    if (error) {
        const { data: tblData, error: tblError } = await supabase.from('listas').select('*').limit(1);
        console.log("Query Results:", tblData);
        console.log("Query Error:", tblError);
    } else {
        console.log("Policies:", data);
    }
}

checkPolicies();
