import { useEffect } from "react";
import { supabase } from "./lib/supabase";

function App() {
  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from("villages")
        .select("*");

      console.log("Supabase data:", data);
      console.log("Supabase error:", error);
    }

    testConnection();
  }, []);

  return <h1>JalSetu</h1>;
}

export default App;